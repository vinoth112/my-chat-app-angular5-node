var fs = require('fs');

var fileHelper = function(){

};

fileHelper.prototype.readFile = function(filename){
    return fs.readFileSync(filename, 'utf8');
};

fileHelper.prototype.writeFile = function(filename,content){
    fs.writeFileSync(filename, content);
    return;
};

module.exports = {
    fileHelper: new fileHelper()
}