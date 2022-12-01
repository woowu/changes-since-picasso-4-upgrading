#!/usr/bin/node --harmony
import * as fs from 'fs'
import * as path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

function DiffProcessor() {
    this.groupDetailFilename = null;
    this.groupSummaryCsv = null;
    this.groupDetailWs = null;
    this.groupSummaryWs = null;
    this.copyrightFilename = null;
    this.changedFilesFilename = null;
    this.todoFileListFilename = null;

    this._currentGroup = null;
    this._symbols = {
        plus: 0,
        minus: 0,
    };
    this._copyrightList = [];
    this._fileList = [];
    this._todoFileList = [];
    this._todoCountInGroup = 0;
    this._nChanges = 0;
    this._diffFilesCount = 0;
}

DiffProcessor.prototype.run = async function() {
    await this._loadCopyrightList();
    await this._loadTodoFileList();
    await this._parseDiffFileList();
}

DiffProcessor.prototype._loadCopyrightList = function() {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join('data', this.copyrightFilename), (err, data) => {
            if (err) return reject(err);
            data.toString().split('\n').forEach(line => {
                if (! line.trim()) return;
                this._copyrightList.push(line.trim().split(' ')[0]);
            });
            resolve()
        });
    });
};

DiffProcessor.prototype._loadTodoFileList = function() {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join('data', this.todoFileListFilename), (err, data) => {
            if (err) return reject(err);
            data.toString().split('\n').forEach(line => {
                if (! line.trim()) return;
                this._todoFileList.push(line.trim().split(' ')[0]);
            });
            console.log(`${this._todoFileList.length} files in the todo list`);
            resolve()
        });
    });
};

DiffProcessor.prototype._parseDiffFileList = function() {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join('data', this.changedFilesFilename), (err, data) => {
            if (err) return reject(err);
            data.toString().split('\n').forEach(line => {
                if (! line.trim()) return;
                this._processDiffLine(line.trim());
            });
            this.end();
            console.log(`${this._diffFilesCount} files in the diff list`);
            resolve()
        });
    });
};

DiffProcessor.prototype.end = function() {
    this._endGroup();
};

DiffProcessor.prototype._processDiffLine = function(line) {
    const [filename, deli, nChanges, symb] = line.split(/\s+/);
    if (this._copyrightList.includes(filename))
        return;

    const group = this._deduceGroupName(filename);
    if (this._currentGroup == null) this._currentGroup = group;
    if (this._currentGroup != group)
        this._newGroup(group)

    this._accumulate({ filename, nChanges: +nChanges, symb });

    if (this._todoFileList.includes(filename)) {
        ++this._todoCountInGroup;
        this._fileList.push(filename + '*' + line.slice(filename.length + 1));
    } else
        this._fileList.push(line);
};

DiffProcessor.prototype._deduceGroupName = function(filename) {
    const comps = filename.split('/');
    for (var i = comps.length - 1; i >= 0; --i) {
        if (comps[i] == 'Public' || comps[i] == 'Sources')
            break;
    }
    var group = comps.slice(1, ! i ? 3 : i).join('/');

    const knownGroups = [
        /(.*)(\/Config[a-zA-Z_-]+?)\//,
        /(.*)(\/MeasurementSystemDriver\/IMS)\//,
        /(.*)(\/Drivers_RX_common)\//,
        /(.*)(\/DisplayLib)\//,
    ];

    for (var i = 0; i < knownGroups.length; ++i) {
        const m = group.match(knownGroups[i]);
        if (m)
            return m.slice(1).join('');
    }
    return group;
};

DiffProcessor.prototype._newGroup = function(group) {
    this._endGroup();
    this._currentGroup = group;
};

DiffProcessor.prototype._endGroup = function() {
    if (this._currentGroup == null) return;

    if (this.groupDetailWs == null)
        this.groupDetailWs = fs.createWriteStream(this.groupDetailFilename);
    if (this.groupSummaryWs == null) {
        this.groupSummaryWs = fs.createWriteStream(this.groupSummaryCsv);
        this.groupSummaryWs.write(`Group,Layer,Plus,Minus,Todo\n`);
    }

    const plus = Math.round(this._symbols.plus);
    const minus = Math.round(this._symbols.minus);

    const layer = this._currentGroup.split('/')[0];
    const func = this._currentGroup.split('/').slice(1).join('/');

    this.groupDetailWs.write(`${layer} ${func}${this._todoCountInGroup ? '*' : ''} | ${this._nChanges} +${plus},-${minus}\n`);
    for (const line of this._fileList)
        this.groupDetailWs.write('    ' + line + '\n');
    this.groupDetailWs.write('\n');

    this.groupSummaryWs.write(`${func},${layer},${plus},${minus},${this._todoCountInGroup ? 'true' : 'false'}\n`);

    this._currentGroup = null;
    this._symbols = {
        plus: 0,
        minus: 0,
    };
    this._todoCountInGroup = 0;
    this._nChanges = 0;
    this._diffFilesCount += this._fileList.length;
    this._fileList = [];
};

DiffProcessor.prototype._accumulate = function({ filename, nChanges, symb }) {
    this._nChanges += nChanges;
    const p = symb.match(/\+/g) ? symb.match(/\+/g).length : 0;
    const m = symb.match(/\-/g) ? symb.match(/\-/g).length : 0;
    if (p)
        this._symbols.plus += nChanges * (p / (p + m));
    if (m)
        this._symbols.minus += nChanges * (m / (p + m));
};

const argv = yargs(hideBin(process.argv))
    .usage('$0 [options]')
    .version('0.0.1')
    .help()
    .argv;

async function main(argv) {
    const processor = new DiffProcessor();

    processor.copyrightFilename = 'Copyright-changes.txt';
    processor.changedFilesFilename = 'changed-source-files.txt';
    processor.groupDetailFilename = 'changes-detail.txt';
    processor.groupSummaryCsv = 'changes-functional-summary.csv';
    processor.todoFileListFilename = 'todo-changes.txt';

    await processor.run();
}
main(argv);
