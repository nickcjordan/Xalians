import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import XalianNavbar from "../components/navbar";
import ListGroup from "react-bootstrap/ListGroup";
import nameSuggestions from "../json/designer/names.json";
import mammalSuggestions from "../json/designer/mammal_species_names.json";
import birdSuggestions from "../json/designer/bird_species_names.json";
import Form from "react-bootstrap/Form";
import DesignerSuggestionRow from "../components/designerSuggestionRow";
import monsters from "../json/designer/monsters.json";

class DesignerPage extends React.Component {
  state = {
    names: nameSuggestions,
    mammals: mammalSuggestions,
    birds: birdSuggestions,
    sizeRangeValue: 0,
    massRangeValue: 0,
    googleToggle: false,
    searchText: "",
    nameMap: {}
  };

  constructor(props) {
    super(props);
    if (!this.state.selectedMammals) {
      this.redo = this.redo.bind(this);
      this.getCurrentSizeString = this.getCurrentSizeString.bind(this);
      this.getCurrentMassString = this.getCurrentMassString.bind(this);
      this.handleMassChange = this.handleMassChange.bind(this);
      this.handleSizeChange = this.handleSizeChange.bind(this);
      this.flipGoogleToggle = this.flipGoogleToggle.bind(this);
      this.setMammalsFromSearchText = this.setMammalsFromSearchText.bind(this);
      this.handleSearchTextChange = this.handleSearchTextChange.bind(this);
    }
    this.setState({ nameMap: new Map() });
  }

  componentDidMount() {
    this.setState({
      minWeight: 3,
      maxWeight: 1000,
      minHeight: 6,
      maxHeight: 240,
    });
    this.resetState();
    this.handleSizeChange(50);
    this.handleMassChange(50);

    // this.redo();
  }

  resetState() {
    this.setState({
      names: nameSuggestions,
      mammals: mammalSuggestions,
      birds: birdSuggestions,
    });
  }

  redo() {
    if (this.state.searchText) {
      this.setMammalsFromSearchText();
    } else {
      var randomMammals = [];
  
      for (let i = 0; i < 1; i++) {
        randomMammals.push(this.pickRandomAnimalFromList(this.state.mammals));
      }
      this.setState({
        selectedMammals: randomMammals,
      });
    }
  }

  pickRandomAnimalFromList(list) {
    var genusMap = new Map();
    list.forEach((animal) => {
      if (genusMap[animal.genus]) {
        let list = genusMap[animal.genus];
        list.push(animal);
        genusMap[animal.genus] = list;
      } else {
        let list = [];
        list.push(animal);
        genusMap[animal.genus] = list;
      }
    });

    let genusList = [];
    for (let key in genusMap) {
      genusList.push(genusMap[key]);
    }

    // console.log(``);

    this.shuffleArray(genusList);
    var randomGenusList = this.selectRandom(genusList);

    this.shuffleArray(randomGenusList);
    return this.selectRandom(randomGenusList);
  }

  selectRandom(list) {
    return list[~~(Math.random() * list.length)];
  }

  /* Randomize array in-place using Durstenfeld shuffle algorithm */
  shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  buildSuggestionList(selectedList) {
    var list = [];

    selectedList.forEach((animal) => {
      list.push(<DesignerSuggestionRow monster={this.selectRandom(monsters)} names={this.selectNamesBasedOnAnimal(animal)} googleToggle={this.state.googleToggle} animal={animal} />);
    });
    return list;
  }

  selectNamesBasedOnAnimal(selectedAnimal) {
    var split = selectedAnimal.english.split(" ");
    var root = split.pop();
    let map = this.state.nameMap;
    if (map[root] && map[root].length && map[root].length > 0) {
      // console.log(`shortcut --> ${root} ${map[root].length}`);
      return map[root];
    } else {
      // console.log("no shortcut");
      var scoreList = [];
      nameSuggestions.forEach((name) => {
        if (root.toLowerCase().includes(name.toLowerCase())) {
          // console.log(`found name containing root: root=${root} :: name=${name}`);
          scoreList.push({
              name: name,
              score: 1,
              root: root,
            });
        } else {
            let score = this.getSimilarityScore(name.toLowerCase(), root.toLowerCase());
            scoreList.push({
              name: name,
              score: score,
              root: root,
            });
        }
      });
  
      scoreList.sort(function (a, b) {
        return b.score - a.score;
      });
  
      var nameList = [];
      // scoreList.slice(0, 50).forEach(scoredName => {
      scoreList.forEach((scoredName) => {
        // console.log(`root=${scoredName.root} :: name=${scoredName.name} :: score=${scoredName.score}`);
        nameList.push(`${scoredName.name}  ${Math.round(scoredName.score * 10) / 10}`);
      });
  
      let map2 = this.state.nameMap
      map2[root] = nameList;
      this.setState({
        nameMap: map2
      });
  
      return nameList;
    }

  }

  getSimilarityScore(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - this.findEditDistance(longer, shorter)) / parseFloat(longerLength);
  }

  findEditDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  handleSizeChange(val) {
    let MAGIC_NUMBER = 2.75;

    let inches = Math.floor((this.state.maxHeight - this.state.minHeight) * (val / 1000) + this.state.minHeight);
    let lbs = Math.floor(inches * MAGIC_NUMBER);
    let currentDiff = lbs - this.state.minWeight;
    let weightDiff = this.state.maxWeight - this.state.minWeight;
    let diffRatio = currentDiff / weightDiff;
    let x = Math.floor(1000 * diffRatio);
    this.setState({
      sizeRangeValue: val,
      massRangeValue: x,
    });
  }

  handleMassChange(val) {
    this.setState({
      massRangeValue: val,
    });
  }

  getCurrentSizeString() {
    const heightDiff = this.state.maxHeight - this.state.minHeight;

    if (this.state.sizeRangeValue) {
      let heightRatio = this.state.sizeRangeValue / 1000;
      let heightVal = heightDiff * heightRatio;
      let inches = Math.floor(this.state.minHeight + heightVal);
      let feet = Math.floor(inches / 12);
      let remainderInches = Math.floor(inches % 12);
      let centimeters = Math.floor(inches * 2.54);
      let meters = Math.floor(centimeters / 100);
      let remainderCentimeters = Math.floor(centimeters % 100);

      var result = "";
      if (feet > 0) {
        result = result + `${feet}ft ${remainderInches}in`;
      } else {
        result = result + `${inches}in`;
      }

      if (meters > 0) {
        result = result + ` / ${meters}m ${remainderCentimeters}cm`;
      } else {
        result = result + ` / ${centimeters}cm`;
      }

      result = result + ` :: ${inches} in / ${centimeters} cm`;

      return result;
    }
  }

  getCurrentMassString() {
    const weightDiff = this.state.maxWeight - this.state.minWeight;

    if (this.state.massRangeValue) {
      let weightRatio = this.state.massRangeValue / 1000;
      let weightVal = weightDiff * weightRatio;
      let lbs = Math.floor(this.state.minWeight + weightVal);
      let kg = Math.floor(lbs / 2.205);

      var result = `${lbs} lbs  /  ${kg} kg`;

      return result;
    }
  }

  flipGoogleToggle() {
    let toggle = this.state.googleToggle
    this.setState({ googleToggle: !toggle });
  }

  setMammalsFromSearchText() {
    console.log("setting mammals from search called");
    var mammals = [];
    mammalSuggestions.forEach(mammal => {
    // this.state.mammals.forEach(mammal => {
      if (mammal.english.toLowerCase().includes(this.state.searchText.toLowerCase())) {
        mammals.push(mammal);
      }
    });

    if (this.state.googleToggle) {
      let len = Math.min(3, mammals.length);
      this.setState({
        selectedMammals: mammals.slice(0, len)
      });
    } else {
      this.setState({
        selectedMammals: mammals
      });
    }
  } 

  handleSearchTextChange(val) {
    this.setState({ searchText: val });
  }

  render() {
    return (
      <React.Fragment>
        <Container fluid className="content-background-container">
          <XalianNavbar></XalianNavbar>

          <Container fluid>
            <Row>
              <span className="sticky-div">
                <Button onClick={this.redo}>Run Suggestions</Button>
                <Form.Check type={"radio"} label={`Show Google Results`} checked={this.state.googleToggle} onClick={this.flipGoogleToggle} />
                <Form.Label htmlFor="searchInput">Search</Form.Label>
                <Form.Control className="search-bar" id="searchInput" onChange={(event) => this.handleSearchTextChange(event.target.value)}/>
              </span>
              <Col className="centered-view">
                <h1 className="design-page-title">Xalian Design AI</h1>
                {this.state.selectedMammals && <React.Fragment>{this.buildSuggestionList(this.state.selectedMammals)}</React.Fragment>}
              </Col>
            </Row>
            <Row>
              <Col md={8} className="centered-div">
                <h1>{this.getCurrentSizeString()}</h1>
                <h1>{this.getCurrentMassString()}</h1>
              </Col>
            </Row>
            <Row>
              <Col md={8} className="centered-div">
                <div classsName="range-wrapper">
                  <Form.Label>Size ({this.state.sizeRangeValue})</Form.Label>
                  <Form.Range max={1000} value={this.state.sizeRangeValue} onChange={(event) => this.handleSizeChange(event.target.value)} />
                </div>
                <div classsName="range-wrapper">
                  <Form.Label>Mass ({this.state.massRangeValue})</Form.Label>
                  <Form.Range max={1000} value={this.state.massRangeValue} onChange={(event) => this.handleMassChange(event.target.value)} />
                </div>
              </Col>
            </Row>
          </Container>
        </Container>
      </React.Fragment>
    );
  }
}

export default DesignerPage;
