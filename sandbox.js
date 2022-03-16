const axios = require("axios");
const ai = require("./lambda/src/ai.js");
const fs = require("fs");
const xalianBuilder = require("./lambda/src/xalianBuilder.js");
const translator = require("./lambda/src/translator.js");
const attackCalculator = require("./lambda/src/gameplay/attackCalculator.js");
const csv = require("csv-parser");
const tools = require("./lambda/src/tools.js");

// module.exports = {
//     main: main
// };

// addNewMoves();

// printMoveStats();

// printNumbers();

// aggregateAnimalsFromFiles();

// getNamesFromAPI();

// cleanupMonsters();

cleanupDesignerAnimalReferences();

function cleanupDesignerAnimalReferences() {
  let animals = JSON.parse(fs.readFileSync("lambda/src/json/designer/animalSizes.json", "utf8").toString());

  var fixed = [];
  animals.forEach(x => {
    fixed.push({
      name: x.name,
      size: x.size,
      mass: x.mass,
      density: Math.floor((x.mass / x.size) * 100) / 100,
      image: "",
      searchName: x.name
    });
  });

  fs.writeFileSync("lambda/src/json/designer/test_animalSizes.json", JSON.stringify(fixed, null, 2))
}

// function cleanupMonsters() {
//   let monsters = JSON.parse(fs.readFileSync("src/json/designer/monsters.json", "utf8").toString());

//   var fixed = [];
//   monsters.forEach(monster => {
//     fixed.push({
//       name: monster.name,
//       meta: monster.meta,
//       traits: buildTraits(monster.Traits),
//       imageUrl: monster.img_url
//     });
//   });

//   fs.writeFileSync("src/json/designer/test_monsters.json", JSON.stringify(fixed, null, 2))
// }

function buildTraits(originalTraits) {
  var traits = [];
  if (originalTraits) {
    let split = originalTraits.split('<p><em><strong>');
    split.forEach(rawTrait => {
      if (rawTrait && rawTrait !== '') {
        let splitTrait = rawTrait.split('</strong></em> ');
        if (splitTrait && splitTrait.length > 1) {
          let traitName = splitTrait[0].replace('.', '');
          let traitDetail = splitTrait[1].replace(' </p>', '');
          traits.push({
            name: traitName,
            detail: traitDetail
          });
        }
      }
    });
  }
  return traits;
}

function extractCommonName(node) {
  var returnVal = null;
  node.common_names.forEach((x) => {
    if (x.lang === "en") {
      returnVal = x.name;
    }
  });
  return returnVal;
}

function getNamesFromAPI() {
  const url = "https://randommer.io/api/Name?nameType=firstname&quantity=999";

  let promises = [];
  for (i = 0; i < 100; i++) {
    try {
      promises.push(axios.get(url, { headers: { "x-api-key": "c256e18c8c9546f4804861405f832851" } }));
      var seconds = 0.5;
      var waitTill = new Date(new Date().getTime() + seconds * 1000);
      while (waitTill > new Date()) {}
      console.log(`done waiting :: count=${promises.length}`);
    } catch(e) {
      console.log(`error :: ${e.message}`);
    }
  }

  const nameSet = new Set();
  var exported = [];
  try {
    Promise.all(promises).then((responses) => {
      responses.forEach((response) => {
        // console.log(JSON.stringify(response.data, null, 2));
        response.data.forEach((name) => {
          nameSet.add(name);
        });
      });

      nameSet.forEach((name) => {
        if (name.length > 2) {
          exported.push(name);
        }
      });
      exported.sort();
      console.log(`exported ${exported.length} names`);
      fs.writeFileSync("src/json/designer/test_new_name_ideas.json", JSON.stringify(exported, null, 2));
    });
  } catch (e) {
    nameSet.forEach((name) => {
      if (name.length > 2) {
        exported.push(name);
      }
    });
    exported.sort();
    console.log(`exported ${exported.length} names`);
    fs.writeFileSync("src/json/designer/test_new_name_ideas.json", JSON.stringify(exported, null, 2));
  }
}

function aggregateAnimalsFromFiles() {
  const mammalFolderName = "C:/dev/src/animal-data/dataset/data/Vertebrata/Mammalia";
  const birdFolderName = "C:/dev/src/animal-data/dataset/data/Vertebrata/Aves";

  var complete = [];

  fs.readdirSync(mammalFolderName).forEach((fileName) => {
    var list = JSON.parse(fs.readFileSync(mammalFolderName + "/" + fileName, "utf8").toString());
    var speciesFamily = fileName.replace(".json", "");
    list.forEach((node) => {
      var extracted = extractCommonName(node);
      if (extracted) {
        complete.push({
          parent: speciesFamily,
          scientific: node.scientific_name,
          english: extracted,
          others: node.common_names,
        });
      }
    });
  });

  fs.writeFileSync("src/json/designer/neww_mammal_species_names.json", JSON.stringify(complete, null, 2));

  complete = [];
  fs.readdirSync(birdFolderName).forEach((fileName) => {
    var list = JSON.parse(fs.readFileSync(birdFolderName + "/" + fileName, "utf8").toString());
    var speciesFamily = fileName.replace(".json", "");
    list.forEach((node) => {
      var extracted = extractCommonName(node);
      if (extracted) {
        complete.push({
          parent: speciesFamily,
          scientific: node.scientific_name,
          common: extracted,
          others: node.common_names,
        });
      }
    });
  });

  fs.writeFileSync("src/json/designer/neww_bird_species_names.json", JSON.stringify(complete, null, 2));
}

function printMoveStats() {
  var map = new Map();
  let fileName = "moves";

  const data = fs.readFileSync("src/json/" + fileName + ".json", "utf8");
  var nodes = JSON.parse(data.toString());

  var special = [];
  var standard = [];

  nodes.forEach((node) => {
    if (node.category == "standard") {
      standard.push(node);
    } else {
      special.push(node);
    }
  });
  console.log(`\nATTACKING MOVES:`);
  let standardSum = standard.map((x) => parseInt(x.effectRating)).reduce(add, 0);
  console.log(`\tstandard :: #=${standard.length} :: sum=${standardSum} :: avg=${standardSum / standard.length}`);

  let specialSum = special.map((x) => parseInt(x.effectRating)).reduce(add, 0);
  console.log(`\tspecial :: #=${special.length} :: sum=${specialSum} :: avg=${specialSum / special.length}`);

  let totalSum = special.map((x) => parseInt(x.effectRating)).reduce(add, 0);
  console.log(`\ttotal :: #=${special.length + standard.length} :: sum=${standardSum + specialSum} :: avg=${(standardSum + specialSum) / (special.length + standard.length)}`);

  var helperSum = 0;
  let helperMap = new Map();
  const helperData = fs.readFileSync("src/json/" + "helping_moves" + ".json", "utf8");
  var helpers = JSON.parse(helperData.toString());
  var helperEffectNames = [];
  helpers.forEach((h) => {
    if (!helperEffectNames.includes(h.effect)) {
      helperEffectNames.push(h.effect);
    }
    var list = helperMap[h.effect];
    if (list) {
      list.push(h);
      helperMap[h.effect] = list;
    } else {
      list = [];
      list.push(h);
      helperMap[h.effect] = list;
    }
    helperSum += 1;
  });

  console.log(`\n\nSTATUS MOVES:`);
  helperEffectNames.forEach((name) => {
    var list = helperMap[name];
    console.log(`\t${name} = ${list.length}`);
  });

  console.log(`\ttotal = ${helperSum}`);

  // console.log(JSON.stringify(helperMap, null, 2));
}

function printNumbers() {
  var species = JSON.parse(fs.readFileSync("src/json/" + "species" + ".json", "utf8").toString());
  var elements = JSON.parse(fs.readFileSync("src/json/" + "elements" + ".json", "utf8").toString());

  var subelements = 0;
  var moveTypes = 0;
  for (var ind in elements) {
    let val = elements[ind];
    moveTypes += val.moveTypes.length;
    subelements += val.elements.length;
  }

  var moves = JSON.parse(fs.readFileSync("src/json/" + "moves" + ".json", "utf8").toString());
  var qualifiers = JSON.parse(fs.readFileSync("src/json/" + "qualifiers" + ".json", "utf8").toString());
  console.log(`species=${species.length}\ntypes=${elements.length}\nmoves=${moves.length}\nqualifiers=${qualifiers.length}\nsubelements=${subelements}\nmoveTypes=${moveTypes}\n`);
}

function addNewMoves() {
  var map = new Map();
  let fileName = "moves";

  const data = fs.readFileSync("src/json/" + fileName + ".json", "utf8");
  var existingMoves = JSON.parse(data.toString());

  let existingMoveMap = new Map();

  existingMoves.forEach((node) => {
    existingMoveMap[node.name] = node;
  });

  var output = [];
  let newMoves = tools.getProperties("newMoves");
  newMoves.forEach((name) => {
    if (name != "") {
      let cleaned = tools.capitalize(name.replace("\r", ""));
      if (existingMoveMap[cleaned]) {
      } else {
        var newMove = {
          name: cleaned,
          definition: "",
          effectRating: 0,
          effect: "",
          sentencePrefix: "",
          category: "status",
        };
        output.push(newMove);
      }
    }
  });

  let dataOut = JSON.stringify(output, null, 2);
  console.log(`data:\n${dataOut}`);

  fs.writeFileSync("src/json/new_" + fileName + ".json", dataOut);
}

function add(accumulator, a) {
  return accumulator + a;
}

// function buildEffectiveness(xNode, names) {
//     let map = new Map();
//     names.forEach(name => {
//         map[name] = 1;
//     });
//     return map;
// }

// var newNode = {
//     "name": node.name,
//     "moveTypes": node.synonyms,
//     "effectiveness": node.effectiveness,
//     "elements": node.elements
// }

// var rowNumber = 0;
// fs.createReadStream('src/csv/character_element_matrix.csv')
//     .pipe(csv())
//     .on('data', (row) => {
//         if (rowNumber != 0) {
//             console.log(row);
//         }
//     })
//     .on('end', () => {
//         console.log('CSV file successfully processed');
//     });
