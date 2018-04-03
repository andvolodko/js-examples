const request = require('request');
const parseString = require('xml2js').parseString;
const fs = require('fs');

const mkdirSync = function (dirPath) {
  try {
    fs.mkdirSync(dirPath)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

const msToMS = function (ms) {
    var M = Math.floor(ms / 60000);
    ms -= M * 60000;
    var S = ms / 1000;
    return M + ":" + S;
}

var SaveBot = function (params) {

    var self = {
        threads:10,
        baseurl:'https://stopwatch-timers.com/',
        sitemap:'sitemap.xml',
        saveDir: '_website/',
        pages:[],
        count:0,
        startTime:0,
        endTime:0,
        threadsCount:0,
        pageIndex:0
    };

    self.parseXML = function(xml) {
        parseString(xml, function (err, result) {
            for (var index = 0; index < result.urlset.url.length; index++) {
                var element = result.urlset.url[index];
                self.pages.push(element.loc[0]);
            }
            self.addAdditionalPages();
        });
    }

    self.addAdditionalPages = function (params) {
        //Add resources
        //self.pages = [];
        // self.pages.push(self.baseurl + 'upl/fbrfg/apple-touch-icon.png');
        // self.pages.push(self.baseurl + 'upl/fbrfg/favicon-32x32.png');
        //
        console.log('Pages to save: ' + self.pages.length);
        self.savePagesToHDD();
    }

    self.savePagesToHDD = function(params){
        self.savePage(self.sitemap, self.sitemapData);
        self.continueSave();
    }

    self.continueSave = function(params){
        for (self.pageIndex; self.pageIndex < self.pages.length; self.pageIndex++) {
            var element = self.pages[self.pageIndex];
            var options = {
                strictSSL: false,
                url:element
            };
            request.get(options, function (error, response, body) {
                self.savePage(response.req.path, body);
                self.threadsCount--;
                self.continueSave();
            });
            console.log("self.pageIndex: " + self.pageIndex, ' / ' + self.pages.length, element);
            self.threadsCount++;
            if(self.threadsCount >= self.threads) {
                self.pageIndex++;
                return;
            }
        }
    }

    self.savePage = function(path, data) {
        mkdirSync(self.saveDir);
        var pathArray = path.split('/');
        if(pathArray.length > 1) {
            var subDirPath = self.saveDir;
            var isStaticFile = false;
            var lastEl = pathArray[pathArray.length-1];
            if(lastEl.indexOf('.') >=0) isStaticFile = true;
            for (var index = 0; index < pathArray.length; index++) {
                var element = pathArray[index];
                if(element.length >= 1) {
                    subDirPath = subDirPath + '/' + element;
                    if(isStaticFile && index == pathArray.length - 1) {
                        console.log('skip mkdir for static file');
                    } else {
                        mkdirSync(subDirPath);
                    }
                }
            }
            path = pathArray.join('/');
            if(!isStaticFile) {
                path += 'index.html';
            }
        }
        fs.writeFile(self.saveDir + path, data, function(err) {
            if(err) {
                return console.log("File not saved: " + path, err);
            }
            console.log("File was saved: " + path);
            self.count++;
            if(self.count > self.pages.length) {
                self.endTime = new Date().getTime();
                var workTime = msToMS(self.endTime - self.startTime);
                console.log("Time taken: " + workTime);
            }
        });
    }

    self.init = function (params) {
        console.log('SaveBot dbInited');
        self.startTime = new Date().getTime();
        var options = {
            strictSSL: false,
            url:self.baseurl + self.sitemap
        };
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log('SaveBot sitemap.xml loaded');
                self.sitemapData = body;
                self.parseXML(body);
            } else {
                console.log('SaveBot sitemap.xml load error');
            }
        });
    };

    setTimeout(self.init, 3000);

    return self;
}

module.exports = SaveBot;

new SaveBot();