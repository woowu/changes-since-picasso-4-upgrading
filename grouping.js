#!/usr/bin/node --harmony
import * as fs from 'fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

function DiffProcessor() {
    this.groupDetailFilename = null;
    this.groupSummaryCsv = null;
    this.groupDetailWs = null;
    this.groupSummaryWs = null;

    this._currentGroup = null;
    this._symbols = {
        plus: 0,
        minus: 0,
    };
    this._nChanges = 0;
    this._copyrightList = [];
    this._fileList = [];
}

DiffProcessor.prototype.loadCopyrightList = function(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) return reject(err);
            data.toString().split('\n').forEach(line => {
                if (! line.trim()) return;
                this._copyrightList.push(line.trim().split(' ')[0]);
            });
            resolve()
        });
    });
};

DiffProcessor.prototype.parseDiffFileList = function(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) return reject(err);
            data.toString().split('\n').forEach(line => {
                if (! line.trim()) return;
                this._processDiffLine(line.trim());
            });
            this.end();
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
        this.groupSummaryWs.write(`Group,Layer,Plus,Minus\n`);
    }

    const plus = Math.round(this._symbols.plus);
    const minus = Math.round(this._symbols.minus);

    this.groupDetailWs.write(`# ${this._currentGroup}    | ${this._nChanges}    + ${plus} - ${minus}\n`);
    for (const line of this._fileList)
        this.groupDetailWs.write(line + '\n');
    this.groupDetailWs.write('\n');

    const layer = this._currentGroup.split('/')[0];
    const group = this._currentGroup.split('/').slice(1).join('/');
    this.groupSummaryWs.write(`${group},${layer},${plus},${minus}\n`);

    this._currentGroup = null;
    this._symbols = {
        plus: 0,
        minus: 0,
    };
    this._nChanges = 0;
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
    .usage('$0 [options] diff-filename-list-file')
    .version('0.0.1')
    .help()
    .option('c', {
        alias: 'copyright',
        describe: 'file list of Copyright-only changes',
        nargs: 1,
        type: 'string',
    })
    .argv;

if (argv._.length < 1) {
    console.error('insufficient positional arguments');
    process.exit(1);
}

async function main(argv) {
    const processor = new DiffProcessor();
    processor.groupDetailFilename = 'group-detail.txt';
    processor.groupSummaryCsv = 'group-summary.csv';

    if (argv.copyright)
        await processor.loadCopyrightList(argv.copyright);
    if (! argv._[0])
        throw new Error('diff filename list file not provided')
    await processor.parseDiffFileList(argv._[0]);
}
main(argv);
