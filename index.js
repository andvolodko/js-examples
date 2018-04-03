const fs = require('fs');
const cheerio = require('cheerio');
const translate = require('google-translate-api');
const sqlString = require('sqlstring');

var TimerTools = function (params) {
    
        var self = {
            dataDir: './data/',
            zonesFile: './data/zones.html',
            zonesFileJson: './data/zones.json',
            zonesFileJsonUA: './data/zones_ua.json',
            zonesFileOutEn: './data/zonesEn.html',
            zonesFileOutUa: './data/zonesUa.html',
            zonesFileSqlOutEn: './data/zonesEn.sql',
            sqlConnOutEn: './data/conn.sql',
            zonesFileSqlOutUa: './data/zonesUa.sql',
            templateOneEnHtml: './data/template_one.html',
            templateOneUaHtml: './data/template_one_ua.html',
            count:0,
            zonesTemp:[],
            startTime:0,
            error:false
        };
    
        self.savePage = function(path, data) {
            mkdirSync(self.saveDir);
            fs.writeFile(self.saveDir2 + path, data, function(err) {
                if(err) {
                    return console.log("File not saved: " + path, err);
                }
                console.log("File was saved: " + path);
                self.count++;
                if(self.count >= self.formats.length) {
                    self.endTime = new Date().getTime();
                    var workTime = msToMS(self.endTime - self.startTime);
                    console.log("Time taken: " + workTime);
                }
            });
        }
    
        self.loadPageAlt = function() {
            var format = self.formats2[self.index];
            var path = format + '.html';
            request.get(self.baseurl2 + format, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log('SaveBot format loaded: ' + format);
                    self.savePage(path, body);
                } else {
                    console.log('SaveBot load error: ' + format);
                }
                self.index++;
                
                if(self.index >= self.formats2.length) {
                    console.log('Finish');
                    console.log('Save count: ' + self.index);
                } else {
                    setTimeout(self.loadPageAlt, self.delay);
                }
            });
        };
    
        self.saveFormat = function (params) {
            var format = self.formats[self.index];
            var path = format + '.html';
            request.get(self.baseurl + format + '/', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log('SaveBot format loaded: ' + format);
                    self.savePage(path, body);
                    self.index++;
    
                    if(self.index >= self.formats.length) {
                        console.log('Finish');
                        console.log('Save count: ' + self.index);
                    } else {
                        setTimeout(self.saveFormat, self.delay);
                    }
    
                } else {
                    console.log('SaveBot load error: ' + format);
                }
            });
        };
    
        self.parseAndSaveToJson = function() {
            var path = self.zonesFile;
            var pathOut = self.zonesFileJson;
            fs.readFile(path, 'utf8', function (err,page) {
                if (err) {
                  return console.log(err);
                }
                var $=cheerio.load(page);
                var zones = [];
                $('tr').each(function(){
                    console.log("Parse tr");
                    var children = $(this).children();
                    
                    var cc = $(children[0]).text();
                    var country = $(children[1]).text();
                    var zoneName = $(children[2]).text();
                    var zoneUTC = $(children[3]).text();

                    var zoneNameArr = zoneName.split('/');
                    var location = zoneNameArr[zoneNameArr.length-1];
                    location = location.split('_').join(' ');

                    console.log("Parse tr finish");

                    zones.push({
                        cc:cc,
                        country:country,
                        location:location,
                        zoneName:zoneName,
                        zoneUTC:zoneUTC
                    });
                });


                var saveObj = {
                    zones:zones
                };

                fs.writeFile(pathOut, JSON.stringify(saveObj, null, 4));
    
                console.log('Finish');
    
                return;
              });
        };
    
        self.clearText = function(text){
            text = text.replace(/[\n\t\r]/g,"");
            return text;
        };
    
        self.arrayShuffle = function(array) {
            let counter = array.length;
        
            // While there are elements in the array
            while (counter > 0) {
                // Pick a random index
                let index = Math.floor(Math.random() * counter);
        
                // Decrease counter by 1
                counter--;
        
                // And swap the last element with it
                let temp = array[counter];
                array[counter] = array[index];
                array[index] = temp;
            }
        
            return array;
        };
        
        self.translateData = function(){
        };

        self.generateHTMLtable = function(pathIn, pathOut){
            var path = self.zonesFileJson;
            var pathOut = pathOut;
            var zonesJsonEN = JSON.parse(fs.readFileSync(path, 'utf8'));
            fs.readFile(pathIn, 'utf8', function (err,page) {
                if (err) {
                  return console.log(err);
                }
                var zonesJson = JSON.parse(page);
                var lines = [];
                for(var i = 0; i < zonesJson.zones.length; i++) {
                    var zone = zonesJson.zones[i];
                    var zoneEn = zonesJsonEN.zones[i];
                    var link = zoneEn.location.toLowerCase();
                    link = link.split(' ').join('-');
                    var line = 
`<tr>
    <td><a href="/pl/czas-na-swiecie/`+link+`" title="Czas lokalny w `+zone.location+`" target="_blank">`+zone.location+`</a></td><td class="wtime">--:--</td><td>`+zone.country+`</td><td>`+zone.cc+`</td><td class="utc">`+zone.zoneUTC+`</td><td>`+zone.zoneName+`</td>
</tr>`;
                    lines.push(line);
                }

                fs.writeFile(pathOut,lines.join('\n'));
    
                console.log('Finish');
    
                return;
              });
        };

        self.generateSQL = function(jsonIn, tplIn, sqlOut){
            var path = jsonIn;
            var pathOut = sqlOut;
            var tplFilePath = tplIn;
            var zonesJsonEN = JSON.parse(fs.readFileSync(self.zonesFileJson, 'utf8'));
            fs.readFile(path, 'utf8', function (err,page) {
                if (err) {
                  return console.log(err);
                }
                var zonesJson = JSON.parse(page);
                
                var lines = [];
                for(var i = 0; i < zonesJson.zones.length; i++) {
                    var tplData = fs.readFileSync(tplFilePath, 'utf8');
                    var zone = zonesJson.zones[i];
                    var zoneEn = zonesJsonEN.zones[i];
                    var link = zoneEn.location.toLowerCase();
                    link = link.split(' ').join('-');

                    var title = zone.title;

                    tplData = tplData.split('{$offset}').join(zone.zoneUTC);
                    tplData = tplData.split('{$location}').join(zone.location);
                    tplData = tplData.split('{$country}').join(zone.country);
                    tplData = tplData.split('{$cc}').join(zone.cc);
                    tplData = tplData.split('{$zoneName}').join(zone.zoneName);

                    var blockquote = zonesJson.blockquote[Math.floor(Math.random()*zonesJson.blockquote.length)];
                    
                    var tags = zone.tags.split(',');
                    tags = self.arrayShuffle(tags);
                    
                    var location_text = zone.location_text;

                    tplData = tplData.split('{$blockquote}').join(blockquote);
                    tplData = tplData.split('{$tags}').join(tags);
                    tplData = tplData.split('{$location_text}').join(location_text);

                    var stringOne = sqlString.format(
                        "INSERT INTO `wordpress`.`wp_posts` (`post_author`, `post_date`, `post_date_gmt`, `post_content`, `post_title`, `comment_status`, `ping_status`, `post_name`, `post_modified`, `post_modified_gmt`, `post_parent`, `guid`, `post_type`) "+
                        "VALUES ('1', NOW(), NOW(), ?, ?, 'closed', 'closed', ?, NOW(), NOW(), ?, 'https://stopwatch-timers.com/?page_id=192', 'page');",
                        [tplData, title, link, zonesJson.parent]
                    );

                    lines.push(stringOne);
                }

                fs.writeFile(pathOut,lines.join('\n'));
    
                console.log('Finish');
    
                return;
              });
        };
    
        self.numerateJson = function(){
            var path = self.zonesFileJson;
            var pathOut = self.zonesFileJson;
            fs.readFile(path, 'utf8', function (err,page) {
                if (err) {
                  return console.log(err);
                }
                var zonesJson = JSON.parse(page);
                
                for(var i = 0; i < zonesJson.zones.length; i++) {
                    var zone = zonesJson.zones[i];
                    zone.indexEN = 226 + i; //226 - DB index
                    //TODO
                    zone.indexUA = 664 + i; //226 - DB index
                    zone.indexRU = 1088 + i; //226 - DB index
                    zone.indexPL = 1512 + i; //226 - DB index
                }

                fs.writeFile(pathOut, JSON.stringify(zonesJson, null, 4));

                console.log('Finish');
    
                return;
              });
        };

        self.translateToUA = function(){
            var path = self.zonesFileJson;
            var pathOut = self.zonesFileJsonUA;
            self.pathOut = pathOut;

            self.zonesFileUA = JSON.parse( fs.readFileSync(pathOut, 'utf8') );

            fs.readFile(path, 'utf8', function (err,page) {
                if (err) {
                  return console.log(err);
                }
                var zonesJson = JSON.parse(page);
                
                self.zones = zonesJson;
                self.lang = 'uk';

                self.translateOne();
    
                return;
              });
        };

        self.translateOne = function(){

            console.log('!!! translateOne');

            var zone = Object.assign({}, self.zones.zones[self.count]);

            self.zone = zone;
            self.error = false;
            var title = self.zones.title;
            title = title.split('{$location}').join(zone.location);

            var location_text = self.zones.location_text;
            location_text = location_text.split('{$location}').join(zone.location);

            zone.zoneName = zone.zoneName.split('_').join(' ');
            zone.zoneName = zone.zoneName.split('/').join(', ');

            var textsEn = [zone.country, zone.location, zone.zoneName, title, location_text];

            textsEn = textsEn.join('.\n');

            translate(textsEn, {to: self.lang}).then(function(res){
                console.log(res.text);

                var texts = res.text.split('.\n');

                if(texts.length < 4) {
                    texts = ['','','',''];
                    self.error = true;
                    debugger;
                }
                
                zone.country = texts[0];
                zone.location = texts[1];
                zone.zoneName = texts[2].split(' / ').join('/');
                zone.zoneName = zone.zoneName.split(', ').join('/');
                zone.title = texts[3];
                zone.location_text = texts[4];

                self.translateTags();

            }).catch(err => {
                console.error(err);
            });

        };

        self.translateTags = function(){

            var zone = self.zone;

            var zoneOrigin = self.zones.zones[self.count];

            var tags = self.zones.tags;
            tags = tags.split('{$location}').join(zoneOrigin.location);
            tags = tags.split('{$country}').join(zoneOrigin.country);

            var textsEn = tags.split(',');
            
            textsEn = textsEn.join("\n");
            //textsEn = JSON.stringify(textsEn);

            translate(textsEn, {to: self.lang}).then(function(res){
                console.log(res.text);

                //res.text = res.text.split('час"').join('час');

                //var texts = JSON.parse(res.text);
                
                var texts = res.text.split('\n');
                
                zone.tags = texts.join(', ');
                zone.index = self.count;

                self.zonesTemp.push(zone);

                self.count++;
                if(self.count >= self.zones.zones.length) {
                    self.zones.zones = self.zonesTemp;
                    fs.writeFile(self.pathOut, JSON.stringify(self.zones, null, 4));
                    console.log('Finish');
                } else {
                    var zonesFile = Object.assign({}, self.zones);
                    self.zonesFileUA.zones.push(zone);
                    fs.writeFileSync(self.pathOut, JSON.stringify(self.zonesFileUA, null, 4));
                    setTimeout(self.translateOne, 1000);
                    if(self.error) {
                        console.log('Break for error');
                        debugger;
                    }
                }
                
            }).catch(err => {
                console.error(err);
            });
        };

        self.removeDuplicateTags = function(){
            var path = self.zonesFileJsonUA;
            var zonesFile = JSON.parse( fs.readFileSync(path, 'utf8') );
            for(var i = 0; i < zonesFile.zones.length; i++) {
                var zone = zonesFile.zones[i];
                var tags = zone.tags;
                tags = tags.split(' ,').join(',');
                tags = tags.split(' , ').join(',');
                tags = tags.split(' , ').join(',');
                tags = tags.split(',');
                var size = tags.length;
                tags = tags.filter (function (value, index, array) { 
                    var val1 = value.toLowerCase();
                    var val2 = array[index].toLowerCase();
                    return val1 == val2;
                });
                console.log(size, tags.length);
                zone.tags = tags.join(',');
            }

            fs.writeFileSync(path, JSON.stringify(zonesFile, null, 4));
            console.log('Finish');
        };

        self.generateSQLConnections = function(){
            var path = self.zonesFileJson;
            var zonesFile = JSON.parse( fs.readFileSync(path, 'utf8') );
            var pathOut = self.sqlConnOutEn;
            var lines = [];

            var term_id_start = 26;
            var term_taxonomy_id_start = 27;

            for(var i = 0; i < zonesFile.zones.length; i++) {
                var zone = zonesFile.zones[i];

                term_id_start++;
                term_taxonomy_id_start++;
                
                var wpTerm = 'wpTerm_' + i;
                var stringOne = sqlString.format(
                    "INSERT INTO `wp_terms` (`name`, `slug`, `term_group`) VALUES (?, ?, 0);", 
                    [wpTerm, wpTerm]
                );
                lines.push(stringOne);

                stringOne = sqlString.format(
                "INSERT INTO `wp_term_taxonomy` (`term_id`, `taxonomy`, `description`, `parent`, `count`) VALUES" +
                `(?, 'post_translations', 'a:4:{s:2:"uk";i:`+zone.indexUA+`;s:2:"en";i:`+zone.indexEN+`;}', 0, 4);`,
                [term_id_start]
                );
                lines.push(stringOne);

                stringOne = sqlString.format(
                "INSERT INTO `wp_term_relationships` (`object_id`, `term_taxonomy_id`, `term_order`) VALUES " +
                "(?, 3, 0)," + // US
                "(?, ?, 0)," + // new term taxonomy
                "(?, 14, 0)," + // UA
                "(?, ?, 0)," + // new term taxonomy
                    [
                        zone.indexEN, zone.indexEN, term_taxonomy_id_start,
                        zone.indexUA, zone.indexUA, term_taxonomy_id_start
                    ]
                );
                lines.push(stringOne);

                //break; //TEMP
            }

            fs.writeFileSync(pathOut, lines.join('\n'));
            console.log('Finish');
        };

        self.init = function (params) {
            console.log('TimerTools Inited');
            self.startTime = new Date().getTime();
            
            // self.parseAndSaveToJson();
            // self.translateData();
            //self.generateHTMLtable(self.zonesFileOutEn);
            //self.generateHTMLtable(self.zonesFileJsonUA, self.zonesFileOutUa);
            //self.generateSQL(self.zonesFileJsonUA, self.templateOneUaHtml, self.zonesFileSqlOutUa);

            // self.numerateJson();
            // self.translateToUA();
            //self.generateHTMLtable(self.zonesFileOutUa);
            //self.removeDuplicateTags();

            self.generateSQLConnections();
        };
    
        self.init();
    
        return self;
    }
    
    new TimerTools();