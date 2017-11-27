var fs = require("fs");

function getDate(d) {
  if (! d) {
    d = new Date();
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function zeroPad(num) {
  var s = ""+num;
  if (s.length < 2) {
    s = "0"+s;
  }
  return s;
}
function getLogPath(path, date) {
  return path.replace(/%[Yy]/g, date.getFullYear()).replace(/%[Mm]/g, zeroPad(date.getMonth()+1)).replace(/%[Dd]/g, zeroPad(date.getDate()));
}

function DatedFileStream(path) {
  (function() { // make sure parent path exists!
    var pathComponents = path.split('/');
    var reconstitutedPath = "";
    var stat;
    for (var i = 0; i < pathComponents.length-1; ++i) {
      reconstitutedPath += pathComponents[i];
      if (pathComponents[i] != "") {
        try {
          stat = fs.statSync(reconstitutedPath);
        } catch (e) {
          if (e.code == 'ENOENT') {
            try {
              fs.mkdirSync(reconstitutedPath, 0777);
            } catch (e) {
              console.log("Unable to create DatedFileStream's path (1) at %s: %s", reconstitutedPath, e);
              throw e;
            }
          } else {
            console.log("Unable to create DatedFileStream's path (2) at %s: %s", reconstitutedPath, e);
            throw e;
          }
        }
      }
      reconstitutedPath += '/';
    }
  })();

  var currentDate;
  var outputStream;

  function swapOutputStream() {
    var todaysDate = getDate();
    if (! outputStream || todaysDate > currentDate) {
      currentDate = todaysDate
      if (outputStream) {
        outputStream.end();
      }
      outputStream = fs.createWriteStream(getLogPath(path, todaysDate), {flags: 'a+'});
    }
  }
  this.write = function(str, encoding) {
    swapOutputStream();
    outputStream.write(str, encoding);
  }

  this.currentPath = function() {
    return getLogPath(currentDate);
  }
}

exports.DatedFileStream = DatedFileStream;
exports.readDateFile = function(path, d) {
  return fs.createReadStream(getLogPath(path, getDate(d)), { encoding: 'utf8' });
}

function objectLogger(stream) {
  return function(obj, encoding) {
    if (! obj.date) {
      obj.date = new Date();
    }
    stream.write(JSON.stringify(obj)+'\n', encoding);
  }
}
exports.objectLogger = objectLogger;

var loggers = {};

exports.named = function(flowname) {
  if (! loggers[flowname]) {
    loggers[flowname] = objectLogger(new DatedFileStream('logs/'+flowname+'-%y-%m-%d.log'));
  }
  return { save: loggers[flowname] };
}