const tools = require('./tools.js');
const fs = require('fs')

fix("elements");
fix("species");
fix("move_names");
fix("qualifiers");

function capitalize(str) {
    const lower = (str + '').toLowerCase();
    return (str + '').charAt(0).toUpperCase() + lower.slice(1);
}

function fix(fileName) {
    var list = tools.getProperties(fileName + ".txt");
    var newList = [];
    list.forEach(element => {
        if (!newList.includes(capitalize(element))) {
            newList.push(capitalize(element))
        } 
    });
    newList.sort();
    var newTextList = "";
    newList.forEach(element => {
        newTextList = newTextList + element + "\n";
    });
    newTextList = newTextList.substring(0, newTextList.length - 1);
    let data = JSON.stringify(newList, null, 2);
    fs.writeFileSync('json/' + fileName + '.json', data);
    fs.writeFileSync('txt/' + fileName + '.txt', newTextList);
}