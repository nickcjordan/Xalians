import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import XalianNavbar from "../components/navbar";
import ListGroup from "react-bootstrap/ListGroup";
import Form from "react-bootstrap/Form";
import nameSuggestions from "../json/designer/names.json";
import mammalSuggestions from "../json/designer/mammal_species_names.json";
import birdSuggestions from "../json/designer/bird_species_names.json";
import languages from "../json/designer/languages.json";

class DesignerPage extends React.Component {
  state = {
    names: nameSuggestions,
    mammals: mammalSuggestions,
    birds: birdSuggestions,
  };

  constructor(props) {
    super(props);

    this.redo = this.redo.bind(this);
  }

  componentDidMount() {
    this.resetState();
    this.redo();
  }

  resetState() {
    this.setState({
      names: nameSuggestions,
      mammals: mammalSuggestions,
      birds: birdSuggestions,
    });
  }


  redo() {
    // var randomMammals = this.pickRandomAnimalFromList(this.state.mammals);
    // var randomBird = this.pickRandomAnimalFromList(this.state.birds);

    // var pickedNames = [];
    var randomMammals = [];

    for (let i = 0; i < 1; i++) {
      // pickedNames.push(this.selectRandom(this.state.names));
      randomMammals.push(this.pickRandomAnimalFromList(this.state.mammals));
    }
    this.setState({
      selectedMammals: randomMammals
      // selectedNames: pickedNames
    });
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
      list.push(this.buildSuggestion(animal));
    });
    return list;
    // var list = [];
    // selectedList.forEach((animal) => {
    //   list.push(this.buildSuggestion(animal));
    // });
    // return list;
  }

  putTextOnClipboard(selected, searchLink, languageClipboardText) {
    navigator.clipboard.writeText(`${selected.english}\n${searchLink}${languageClipboardText}`);
  }

  buildSuggestion(selected) {
    var searchLink = `https://www.google.com/search?igu=1&q=${selected.english + " " + selected.scientific}`;
    var whitelist = ["ace", "af", "als", "ay", "bar", "bjn", "bm", "br", "bs", "ca", "cdo", "cy", "de", "diq", "eml", "es", "et", "eu", "fr", "frr", "gl", "gn", "ha", "id", "is", "it", "jbo", "kg", "kw", "lad", "lb", "ms", "mt", "mwl", "nds", "nl", "nn", "nrm", "pam", "pdc", "pt", "qu", "rw", "sn", "so", "sq", "srn", "stq", "tl", "tpi", "vec", "war", "wo", "eo", "da", "et", "de"];
    
    // var debugMap = new Map();

    // whitelist.forEach(lang => {
    //   debugMap[lang] = "";
    //   // debuglist.push(<iframe className="frame" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" src={`https://www.google.com/search?igu=1&q=iso language code ${lang}`}></iframe>);
    // });
    // console.log(JSON.stringify(debugMap));
    
    // return (
    //   <React.Fragment>
    //     <Row className="">
    //       <Col md={8} className="designer-suggestion-box">
    //         {/* {debuglist} */}
    //       </Col>
    //     </Row>
    //   </React.Fragment>
    // );
    
    var langMap = new Map();
    if (selected.others) {
      selected.others.forEach((translation) => {
        let languageName = languages[translation.lang];
        if (whitelist.includes(translation.lang)) {
          if (langMap[translation.name]) {
            let list = langMap[translation.name];
            list.push(languageName);
            langMap[translation.name] = list;
          } else {
            let list = [];
            list.push(languageName);
            langMap[translation.name] = list;
          }
        }
      });
    }
    
    var otherList = [];
    var languageClipboardText = "";
    for (let key in langMap) {
      let langList = langMap[key];
      let langString = langList.join(", ");
      let displayString = `${key} (${langString})`;
      languageClipboardText = languageClipboardText + `\n\t${displayString}`;
      otherList.push(
        <h6>
          {displayString}
        </h6>
      );
    }

    var namesRows = [];
    for (let i = 0; i < 10; i++) {
      namesRows.push(<h4>{this.selectRandom(this.state.names)}</h4>);
    }

    let nameMinusgenus = selected.scientific.replace(selected.genus + " ", "");
    let combined = (
      <React.Fragment>
        <h2>
          <span className="design-species-genus-text">{selected.genus}</span> {nameMinusgenus}
        </h2>
      </React.Fragment>
    );

    return (
      <React.Fragment>
        <Row className="dark-section-div design-results-row vertically-center-contents">
          <Col md={1}>
            <Button
              onClick={() => {
                this.putTextOnClipboard(selected, searchLink, languageClipboardText);
              }}
            >
              <i class="bi bi-clipboard-plus"></i>
            </Button>
            <br />
            <br />
            {namesRows}
          </Col>
          <Col md={3}>
            <a href={`https://www.google.com/search?q=${selected.english}`} target="_blank">
              <h1>{selected.english}</h1>
            </a>
            <hr />
            <a href={`https://www.google.com/search?q=${selected.scientific}`} target="_blank">
              {combined}
            </a>
            {otherList}
          </Col>
          <Col md={8}>
            <div className="centered-view designer-suggestion-box vertically-center-contents">
              <iframe className="frame" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" src={searchLink}></iframe>
            </div>
          </Col>
        </Row>
      </React.Fragment>
    );
  }

  render() {
    return (
      <React.Fragment>
        <Container fluid className="content-background-container">
          <XalianNavbar></XalianNavbar>

          <Container fluid>
            <Row className="content-row">
            <span className="sticky-div"><Button onClick={this.redo}>Run Again</Button></span>
              <Col className="centered-view">
                <h1 className="design-page-title">Xalian Design AI</h1>
                {this.state.selectedMammals && <React.Fragment>{this.buildSuggestionList(this.state.selectedMammals)}</React.Fragment>}
              </Col>
            </Row>
          </Container>
        </Container>
      </React.Fragment>
    );
  }
}

export default DesignerPage;
