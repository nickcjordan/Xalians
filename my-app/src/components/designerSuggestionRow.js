import React from "react";
import ListGroup from "react-bootstrap/ListGroup";
import Badge from "react-bootstrap/Badge";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import languages from "../json/designer/languages.json";
import Button from "react-bootstrap/Button";
import nameSuggestions from "../json/designer/names.json";
import elements from "../json/elements.json";

class DesignerSuggestionRow extends React.Component {
  state = {
    visibility: false,
  };

  componentDidMount() {
    console.log(`component mounted :: ${this.props.animal.english}`);
  }

  selectRandom(list) {
    return list[~~(Math.random() * list.length)];
  }

  buildMonsterTraits() {
    var results = [];
    this.props.monster.traits.forEach(trait => {
        results.push(<h6>{trait.name}: {trait.detail}</h6>);
       
    })
    return results;
  }

  render() {
    var selected = this.props.animal;
    var searchLink = `https://www.google.com/search?igu=1&q=${selected.english + " " + selected.scientific}`;
    var whitelist = ["ace", "af", "als", "ay", "bjn", "bm", "br", "bs", "ca", "cdo", "cy", "de", "diq", "eml", "es", "et", "eu", "fr", "frr", "gl", "gn", "ha", "id", "is", "it", "jbo", "kg", "kw", "lad", "lb", "ms", "mt", "mwl", "nds", "nl", "nn", "nrm", "pam", "pdc", "pt", "qu", "rw", "sn", "so", "sq", "srn", "stq", "tl", "tpi", "vec", "war", "wo", "eo", "da", "et", "de"];

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
      otherList.push(<h6>{displayString}</h6>);
    }

    // var selectedNames = this.selectNamesBasedOnAnimal(selected);
    var selectedNames = this.props.names;

    var namesRows = [];
    selectedNames.forEach((selectedName) => {
      namesRows.push(<h6>{selectedName}</h6>);
    });

    let nameMinusgenus = selected.scientific.replace(selected.genus + " ", "");
    let combined = (
      <React.Fragment>
        <h2>
          <span className="design-species-genus-text">{selected.genus}</span> {nameMinusgenus}
        </h2>
      </React.Fragment>
    );

    let randomType = this.selectRandom(elements);
    let randomElement = this.selectRandom(randomType.elements);

    let mythUrl = 'https://www.generatormix.com/mythical-creatures-generator';

    return (
      <React.Fragment>
          <div className="dark-section-div">

          
        <Row className=" design-results-row vertically-center-contents">
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
            <div className="scrollable-section">{namesRows}</div>
          </Col>
          <Col md={3}>
            <h2>
              {randomElement} ({randomType.name})
            </h2>
            <a href={`https://www.google.com/search?q=${selected.english}`} target="_blank">
              <h1>{selected.english}</h1>
            </a>
            <hr />
            <a href={`https://www.google.com/search?q=${selected.scientific}`} target="_blank">
              {combined}
            </a>
            {otherList}
          </Col>
          {this.props.googleToggle && (
            <Col md={8}>
              <div className="centered-view designer-suggestion-box vertically-center-contents">
                <iframe className="frame" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" src={searchLink}></iframe>
              </div>
            </Col>
          )}
        </Row>
        <Row className=" design-results-row vertically-center-contents">
            <Col md={2}>
            <h1>{this.props.monster.name}</h1>
            <h2>{this.props.monster.meta}</h2>
            {/* {this.buildMonsterTraits()} */}
            </Col>
            <Col md={2}>
                <img src={this.props.monster.imageUrl} class="planet-img img-fluid monster-image" alt=""></img>
            </Col>
            {this.props.googleToggle && (
            <Col md={8}>
              <div className="centered-view designer-suggestion-box vertically-center-contents">
                <iframe className="frame" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" src={mythUrl}></iframe>
              </div>
            </Col>
          )}
        </Row>
        </div>
      </React.Fragment>
    );
  }


  putTextOnClipboard(selected, searchLink, languageClipboardText) {
    navigator.clipboard.writeText(`${selected.english}\n${searchLink}${languageClipboardText}`);
  }
}

export default DesignerSuggestionRow;
