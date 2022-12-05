#!/usr/bin/node --harmony
import fs from 'fs'
import path from 'path'
import util from 'util';
import { EventEmitter } from 'events';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

/**
 * Map values in the domain to values in the range.
 * param domain Array two numbers in the form [min, max]
 * param range Array two numbers in the form [min, max]
 */
function LinearScale(domain, range) {
    const [x0, y0, x1, y1] = [domain[0], range[0], domain[1], range[1]];
    this._m = (y1 - y0) / (x1 - x0);
    this._x0 = x0;
    this._y0 = y0;
}

/**
 * Map value x in domain to the corresponding value y in the range.
 * returns number the y
 */
LinearScale.prototype.map = function(x) {
    return (x - this._x0) * this._m;
}

function File(filename, module, nChanges, plus, minus, hasTodo, diffLine) {
    this.filename = filename;
    this.module = module;
    this.nChanges = +nChanges;
    this.plus = +plus;
    this.minus = +minus;
    this.hasTodo = hasTodo;
    this.diffLine = diffLine;
}

/**
 * A file's net deletion ratio is the ratio of (minus - plus) / nChanges of the
 * file. When the calculated ratio is less than a threshold, the ratio is
 * converted to zero.
 */
File.prototype.getNetDeletionRatio = function() {
    const r = (this.minus - this.plus) / this.nChanges;
    return r < .1 ? 0 : r;
};

function Module(name) {
    this.name = name;
    this.files = [];
}

Module.prototype.appendDiffFile = function(file) {
    this.files.push(file);
};

Module.prototype.getChangesSum = function() {
    var nChanges = 0;
    var plus = 0;
    var minus = 0;
    var score = 0;

    for (const f of this.files) {
        nChanges += f.nChanges;
        plus += f.plus;
        minus += f.minus;
    }
    return { nChanges, plus: Math.round(plus), minus: Math.round(minus) };
};

Module.prototype.hasTodo = function() {
    for (var i = 0; i < this.files.length; ++i)
        if (this.files[i].hasTodo) return true;
    return false;
};

Module.prototype.getNumberOfTodos = function() {
    var n = 0;
    for (const f of this.files)
        if (f.hasTodo) ++n;
    return n;
};

/**
 * A module's net deletion ratio is the sum of net deletion ratio of all the
 * files in this module.
 */
Module.prototype.getNetDeletionRatio = function() {
    return this.files.reduce((acc, curr) => acc + curr.getNetDeletionRatio(), 0);
};

function ModuleList() {
    this.modules = [] ;
    this._activeModule = null;
}

ModuleList.prototype.appendDiffFile = function(file) {
    if (! this._activeModule) {
        this._activeModule = new Module(file.module);
        this._activeModule.appendDiffFile(file);
        return;
    }
    if (file.module == this._activeModule.name) {
        this._activeModule.appendDiffFile(file);
        return;
    }
    this.modules.push(this._activeModule);
    this._activeModule = new Module(file.module)
    this._activeModule.appendDiffFile(file);
};

ModuleList.prototype.end = function() {
    if (this._activeModule) this.modules.push(this._activeModule);

    const todoScale = new LinearScale(this._getModulesTodoExtend(), [0, 45]);
    const deletionScale = new LinearScale(this._getModulesDeletionExtend(), [0, 40]);
    const changesScale = new LinearScale(this._getModulesChangesExtend(), [0, 15]);

    for (const m of this.modules) {
        m.score = todoScale.map(m.getNumberOfTodos())
            + deletionScale.map(m.getNetDeletionRatio())
            + changesScale.map(m.getChangesSum().nChanges);
    }
    for (const m of this.modules) {
        const { nChanges, plus, minus } = m.getChangesSum();
        console.log(m.name,
            m.getNumberOfTodos(),
            m.getNetDeletionRatio().toFixed(2),
            m.getChangesSum().nChanges,
            m.score.toFixed(2)
        );
    }
};

/**
 * Each module has zero to N todo files, this function get the minimum and
 * maximum value of N.
 */
ModuleList.prototype._getModulesTodoExtend = function() {
    var min = Number.MAX_SAFE_INTEGER;
    var max = Number.MIN_SAFE_INTEGER;

    for (const m of this.modules) {
        const n = m.getNumberOfTodos();
        if (n >= max) max = n;
        if (n <= min) min = n;
    }
    return [min, max];
};

ModuleList.prototype._getModulesDeletionExtend = function() {
    var min = Number.MAX_SAFE_INTEGER;
    var max = Number.MIN_SAFE_INTEGER;

    for (const m of this.modules) {
        const n = m.getNetDeletionRatio();
        if (n >= max) max = n;
        if (n <= min) min = n;
    }
    return [min, max];
};

ModuleList.prototype._getModulesChangesExtend = function() {
    var min = Number.MAX_SAFE_INTEGER;
    var max = Number.MIN_SAFE_INTEGER;

    for (const m of this.modules) {
        const n = m.getChangesSum().nChanges;
        if (n >= max) max = n;
        if (n <= min) min = n;
    }
    return [min, max];
};

function DiffFileParser() {
    EventEmitter.call(this);

    this._copyrightList = [];
    this._todoFileList = [];
}
util.inherits(DiffFileParser, EventEmitter);

/**
 * filename param string Name of file which contains a list of filename each of
 *  which is a name of changed file.
 * copyrightFilename param string Name of file which contains a list of filename
 *  each of which is a file containing todo-only changes.
 * todoListFilename param string Name of file which contains a list of filename
 *  each of which is a file containing todo changes.
 */
DiffFileParser.prototype.parse = function(filename, copyrightFilename, todoListFilename) {
    const waits = [];

    const handleFilenameFile = function(filename, array, resolve, reject) {
        fs.readFile(filename, (err, data) => {
            if (err) reject(err);
            data.toString().split('\n').forEach(line => {
                if (! line.trim()) return;
                array.push(line.trim().split(' ')[0]);
            });
            resolve();
        });
    };

    waits.push(new Promise((resolve, reject) => {
        handleFilenameFile(copyrightFilename, this._copyrightList, resolve, reject);
    }));
    waits.push(new Promise((resolve, reject) => {
        handleFilenameFile(todoListFilename, this._todoFileList, resolve, reject);
    }));
    Promise.all(waits).then(() => {
        fs.readFile(filename, (err, data) => {
            if (err) return reject(err);
            data.toString().split('\n').forEach(line => {
                if (! line.trim()) return;
                this._processDiffLine(line.trim());
            });
            this.emit('eof');
        });
    });
};

DiffFileParser.prototype._processDiffLine = function(diffLine) {
    const deduceModuleName = function(filename) {
        const comps = filename.split('/');
        for (var i = comps.length - 1; i >= 0; --i) {
            if (comps[i] == 'Public' || comps[i] == 'Sources')
                break;
        }
        var module = comps.slice(1, ! i ? 3 : i).join('/');

        const knownModules = [
            /(.*)(\/Config[a-zA-Z_-]+?)\//,
            /(.*)(\/MeasurementSystemDriver\/IMS)\//,
            /(.*)(\/Drivers_RX_common)\//,
            /(.*)(\/DisplayLib)\//,
        ];

        for (var i = 0; i < knownModules.length; ++i) {
            const m = module.match(knownModules[i]);
            if (m)
                return m.slice(1).join('');
        }
        return module;
    };

    var [filename, deli, nChanges, symb] = diffLine.split(/\s+/);
    if (this._copyrightList.includes(filename))
        return;

    nChanges = +nChanges;
    const p = symb.match(/\+/g) ? symb.match(/\+/g).length : 0;
    const m = symb.match(/\-/g) ? symb.match(/\-/g).length : 0;

    this.emit('file', new File(filename,
        deduceModuleName(filename),
        nChanges,
        nChanges * p / (p + m),
        nChanges * m / (p + m),
        this._todoFileList.includes(filename),
        this._todoFileList.includes(filename)
            ? filename + '*' + diffLine.slice(filename.length + 1)
            : diffLine,
    ));
};

function ModulesDetailReporter(filename) {
    this._filename = filename;
}

ModulesDetailReporter.prototype.run = function(modules) {
    var ttlChanges = 0;
    var filesCount = 0;
    var ttlTodo = 0;
    const ws = fs.createWriteStream(this._filename);

    for (const m of modules.modules) {
        const { nChanges, plus, minus } = m.getChangesSum();
        ttlChanges += nChanges;
        const hasTodo = m.hasTodo();
        if (hasTodo) ttlTodo += m.getNumberOfTodos();
        ws.write(`${m.name}${hasTodo ? '*' : ''} changes ${nChanges}`
            + ` (+${plus} -${minus}) score ${m.score.toFixed(2)}\n`);
        for (const f of m.files) {
            ws.write(`    ${f.diffLine}\n`);
            ++filesCount;
        }
        ws.write('\n');
    }
    console.log(`${ttlChanges} lines changed in ${filesCount} files`
        + ` of ${modules.modules.length} modules; ${ttlTodo} files has TODOs`);
    ws.end();
}

function ModulesSummaryReporter(filename) {
    this._filename = filename;
}

ModulesSummaryReporter.prototype.run = function(modules) {
    const ws = fs.createWriteStream(this._filename);
    ws.write('Module,Layer,Changes,Plus,Minus,Todo,Score\n');
    for (const m of modules.modules) {
        const { nChanges, plus, minus } = m.getChangesSum();
        const moduleName = m.name.split('/').slice(1).join('/');
        const layer = m.name.split('/')[0];
        ws.write(`${moduleName},${layer},${nChanges},${plus},${minus}`
            + `,${m.hasTodo()},${m.score.toFixed(2)}\n`);
    }
    ws.end();
}

const argv = yargs(hideBin(process.argv))
    .usage('$0 [options]')
    .version('0.0.2')
    .help()
    .argv;

(async function () {
    const modules = new ModuleList();
    const fileParser = new DiffFileParser();

    const report = function() {
        const mdr = new ModulesDetailReporter('changes-detail.txt');
        const msr = new ModulesSummaryReporter('changes-functional-summary.csv');
        mdr.run(modules);
        msr.run(modules);
    }

    fileParser.on('file', file => {
        modules.appendDiffFile(file);
    });
    fileParser.on('eof', () => {
        modules.end();
        report();
    });
    fileParser.parse('data/changed-source-files.txt',
        'data/Copyright-changes.txt',
        'data/todo-changes.txt'
    );
}());
