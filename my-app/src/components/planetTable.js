import React from 'react'
import Container from 'react-bootstrap/Container';
import TextReaderModal from '../components/textReaderModal';
import { Hub } from 'aws-amplify';
import XalianSpeciesBadge from './xalianSpeciesBadge';

/**
 * A planetary survey record.
 *
 * Laid out as a dossier rather than a three-column card: one photographic plate
 * carrying the world, the rendered globe pinned to it as a subordinate locator,
 * and the record itself printed alongside. The previous version put the globe
 * and the landscape side by side at equal weight, so the two images competed
 * and the specs floated in the gap between them.
 */
class PlanetTable extends React.Component {

  state = { showing: false }

  toggleShowHistory = () => {
    if (!this.state.showing) {
      Hub.dispatch('navbar-channel', { event: 'hide-navbar', data: null, message: null });
    } else {
      Hub.dispatch('navbar-channel', { event: 'show-navbar', data: null, message: null });
    }
    this.setState({ showing: !this.state.showing });
  }

  hideHistory = () => {
    Hub.dispatch('navbar-channel', { event: 'show-navbar', data: null, message: null });
    this.setState({ showing: false });
  }

  getHistoryParagraphs(history) {
    var result = [];
    var tempImage = null;
    history.forEach((para, i) => {
      if (tempImage) {
        result.push(<p key={i}>{para} <img src={tempImage} alt="" style={{ float: 'left', maxWidth: '25vw', width: '100px', padding: '5px' }} /></p>);
        tempImage = null;
      } else if (para.toString().includes('IMAGE_INSERT:')) {
        tempImage = para.replace('IMAGE_INSERT:', '');
      } else {
        result.push(<p key={i}>{para}</p>);
      }
    });
    return result;
  }

  buildSpecs() {
    let pairs = [];
    for (const key in this.props.planet.data) {
      if (key.toLowerCase() !== 'type') {
        pairs.push(
          <React.Fragment key={key}>
            <dt className="g-spec-key">{key}</dt>
            <dd className="g-spec-val">{this.props.planet.data[key]}</dd>
          </React.Fragment>
        );
      }
    }
    return pairs;
  }

  render() {
    let type = this.props.planet.data.Type.toLowerCase();
    let hasHistory = this.props.planet.history && this.props.planet.history.length > 0;

    return (
      <React.Fragment>
        {/* the corner flash keys the card to its element; the badge below
            already names it, so the panel does not repeat it with data-tag */}
        <div className={`g-panel g-panel--tagged g-el-${type} planet-panel`}>
          <div className="planet-record">

            {/* the heading spans the full width so the name and the story key
                use the horizontal room instead of leaving the right half empty */}
            <header className="planet-record-head">
              <div className="planet-record-ident">
                <p className="g-kicker">Survey Record</p>
                <h2 className="g-h2 planet-record-name">{this.props.planet.name}</h2>
              </div>
              <div className="planet-record-actions">
                <XalianSpeciesBadge type={type} />
                {hasHistory && (
                  <button type="button" className="g-btn planet-story-btn" onClick={this.toggleShowHistory}>
                    <i className="bi bi-book" /> Read the story
                  </button>
                )}
              </div>
            </header>

            <div className="planet-record-plate">
              <div className="planet-plate">
                <img className="planet-plate-img" src={this.props.planet.image} alt="" />
              </div>
              {/* the globe is a locator, mounted in its own darkened porthole so
                  it reads against the bright plate behind it rather than
                  dissolving into it */}
              <span className="planet-globe-mount">
                <img className="planet-globe" src={this.props.planet.planetImage} alt="" />
              </span>
            </div>

            <dl className="g-spec planet-spec">
              {this.buildSpecs()}
            </dl>

          </div>
        </div>

        {this.props.planet.history &&
          <TextReaderModal
            title={'The History of ' + this.props.planet.name}
            body={this.getHistoryParagraphs(this.props.planet.history)}
            show={this.state.showing}
            light
            onHide={this.hideHistory}>
          </TextReaderModal>
        }
      </React.Fragment>
    );
  }

}


export default PlanetTable;
