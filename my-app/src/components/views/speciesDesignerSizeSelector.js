import React, { PureComponent } from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import animalSizes from '../../json/designer/animalSizes.json';
import nameSuggestions from '../../json/designer/names.json';
import mammalSuggestions from '../../json/designer/mammal_species_names.json';
import languages from "../../json/designer/languages.json";
import planets from "../../json/planets.json";
import species from "../../json/species.json";
import * as styleUtil from '../../utils/styleUtil';


class SpeciesDesignerSizeSelector extends React.Component {
	state = { animals: [] };

	componentDidMount() {
		let animals = [];
		animalSizes.forEach((animal) => {
			animal.density = Math.floor((animal.mass * 100 / animal.size) );
			animals.push(animal);
		});
		let planetOptions = this.buildPlanetOptions();
		this.setState({
			minMass: 1,
			maxMass: 1000,
			minHeight: 6,
			maxHeight: 240,
			densityRangeValue: 0,
			sizeRangeValue: 0,
			animals: animals,
			closestSize: animals[0],
			closestMass: animals[0],
			closestDensity: animals[0],
			planetOptions: planetOptions,
			nextSpeciesId: this.getNextSpeciesId(),
		});
		// this.handleSizeChange(0);
		// this.handleMassChange(0);
	}

	getNextSpeciesId() {
		let sorted = species.sort((a, b) => {
			return parseInt(a.id) - parseInt(b.id);
		});
		let nextId = parseInt(sorted[sorted.length - 1].id) + 1;
		let idString = nextId.toString();
		while (idString.length < 5) {
			idString = '0' + idString;
		}
		return idString;
	}

	handleSizeChange(val) {
		let sizeRef = this.getClosestSizeReference(val);
		let massRef = this.getClosestMassReference((val * this.state.densityRangeValue)/100);
		let xalianSpeciesRef = this.getClosestSpeciesReference(val);
		this.setState({
			sizeRangeValue: val,
			closestSize: sizeRef,
			xalianSpeciesRefLow: xalianSpeciesRef.low,
			xalianSpeciesRefHigh: xalianSpeciesRef.high,
			closestMass: massRef
		});
	}

	// handleMassChange(val) {
	// 	let massRef = this.getClosestMassReference(val);
	// 	let densityRef = this.getClosestDensityReference(this.state.sizeRangeValue, val);
	// 	this.setState({
	// 		massRangeValue: val,
	// 		closestMass: massRef,
	// 		closestDensity: densityRef,
	// 	});
	// }

	handleDensityChange(val) {
		let densityRef = this.getClosestDensityReference(val);
		let massRef = this.getClosestMassReference((val * this.state.sizeRangeValue) / 100);
		this.setState({
			densityRangeValue: val,
			closestDensity: densityRef,
			closestMass: massRef
		});
	}

	getClosestSizeReference = (val) => {
		var selected = null;
		var diff = 1000000;
		this.state.animals.forEach((ref) => {
			let thisDiff = Math.abs(val - ref.size);
			if (thisDiff < diff) {
				diff = thisDiff;
				selected = ref;
			}
		});
		return selected;
	};

	getClosestMassReference = (val) => {
		var selected = null;
		var diff = 1000000;
		this.state.animals.forEach((ref) => {
			let thisDiff = Math.abs(val - ref.mass);
			if (thisDiff < diff) {
				diff = thisDiff;
				selected = ref;
			}
		});
		return selected;
	};

	// getClosestDensityReference = (size, mass) => {
	// 	var selected = null;
	// 	var diff = 1000000;
	// 	this.state.animals.forEach((ref) => {
	// 		let thisDiff = Math.abs(mass / size - ref.density);
	// 		if (thisDiff < diff) {
	// 			diff = thisDiff;
	// 			selected = ref;
	// 		}
	// 	});
	// 	return selected;
	// };

	getClosestDensityReference = (val) => {
		var selected = null;
		var diff = 1000000;
		this.state.animals.forEach((ref) => {
			let thisDiff = Math.abs(val - ref.density);
			if (thisDiff < diff) {
				diff = thisDiff;
				selected = ref;
			}
		});
		return selected;
	};

	getClosestSpeciesReference = (size) => {
		var selectedLow = null;
		var selectedHigh = null;
		var diffLow = 1000000;
		var diffHigh = 1000000;
		species.forEach((xalian) => {
			let xalianSize = parseInt(xalian.height.split('/')[1].replace(' cm', ''));
			if (xalianSize < size) {
				let thisDiff = Math.abs(xalianSize - size);
				if (thisDiff < diffLow) {
					diffLow = thisDiff;
					selectedLow = xalian;
				}
			} else {
				let thisDiff = Math.abs(xalianSize - size);
				if (thisDiff < diffHigh) {
					diffHigh = thisDiff;
					selectedHigh = xalian;
				}
			}
		});
		return { low: selectedLow, high: selectedHigh };
	};

	getCurrentSizeString() {
		if (this.state.sizeRangeValue) {
			return this.getSizeString(this.state.sizeRangeValue);
		}
	}

	getSizeString(cm) {
			let centimeters = cm;
			let inches = Math.floor(centimeters / 2.54);
			let feet = Math.floor(inches / 12);
			let remainderInches = Math.floor(inches % 12);
			let meters = Math.floor(centimeters / 100);
			let remainderCentimeters = Math.floor(centimeters % 100);

			var result = '';
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

	getCurrentDensityString() {
		if (this.state.densityRangeValue) {
			let densityVal = this.state.densityRangeValue;
			var result = `${densityVal} g/cm`;
			return result;
		}
	}
	getAnimalNameLangages(animal) {
		var mammals = [];
		mammalSuggestions.forEach((mammal) => {
			if (
				mammal &&
				mammal.english &&
				mammal.english.toLowerCase().includes(animal.searchName.toLowerCase())
				// &&
				// (mammal.english.toLowerCase().includes(" " + name.toLowerCase())
				// || mammal.english.toLowerCase().includes(name.toLowerCase() + " ")
				// || mammal.english.toLowerCase() == name.toLowerCase())
			) {
				mammals.push(mammal);
			}
		});
		return mammals;
	}

	getListOfTranslations(animal) {
		var otherList = [];
		let langMap = this.getLangMap(animal);
		for (let key in langMap) {
			let langList = langMap[key];
			let langString = langList.join(', ');
			// let displayString = `${key}: (${langString})`;
			otherList.push(
				<React.Fragment>
					<a href={`https://www.google.com/search?q=${key}`} target="_blank">
						<h5 style={{ color: 'white' }}>{key}</h5>
					</a>
					<h6>{langString}</h6>
				</React.Fragment>
			);
		}
		return otherList;
	}

	buildPlanetOptions() {
		let options = [];
		var ind = 1;
		planets.forEach((planet) => {
			options.push(
				<option style={{ backgroundColor: styleUtil.getTypeColor(planet.data.Type.toLowerCase()) }} value={ind}>
					{planet.name + ' (' + planet.data.Type + ')'}
				</option>
			);
			ind += 1;
		});
		return options;
	}

	handlePlanetChange(i) {
		let list = planets.values();
		var ind = 1;
		let selected = null;
		planets.forEach((planet) => {
			if (ind == i) {
				selected = planet;
			}
			ind += 1;
		});
		this.setState({ selectedPlanet: selected });
	}

	getLangMap(animal) {
		var whitelist = ['ace', 'af', 'als', 'ay', 'bjn', 'bm', 'br', 'bs', 'ca', 'cdo', 'cy', 'de', 'diq', 'eml', 'es', 'et', 'eu', 'fr', 'frr', 'gl', 'gn', 'ha', 'id', 'is', 'it', 'jbo', 'kg', 'kw', 'lad', 'lb', 'ms', 'mt', 'mwl', 'nds', 'nl', 'nn', 'nrm', 'pam', 'pdc', 'pt', 'qu', 'rw', 'sn', 'so', 'sq', 'srn', 'stq', 'tl', 'tpi', 'vec', 'war', 'wo', 'eo', 'da', 'et', 'de'];
		if (animal) {
			let langs = this.getAnimalNameLangages(animal);
			var langMap = new Map();
			langs.forEach((selected) => {
				if (selected && selected.others) {
					var selectedList = [];
					selected.others.forEach((translation) => {
						let languageName = languages[translation.lang] + ': ' + translation.name;
						if (whitelist.includes(translation.lang)) {
							selectedList.push();
							if (langMap[selected.english]) {
								let list = langMap[selected.english];
								list.push(languageName);
								langMap[selected.english] = list;
							} else {
								let list = [];
								list.push(languageName);
								langMap[selected.english] = list;
							}
						}
					});
				}
			});
		}
		return langMap;
	}

	render() {
		return (
			<div className=" vertically-center-contents stackable-margin">
				<Row style={{ width: '100%' }}>
					{/* <Row>
						<Col className="centered-div">
							<h1>{this.getCurrentSizeString()}</h1>
							<h1>{this.getCurrentMassString()}</h1>
						</Col>
					</Row> */}
					<Row>
						<Col className="centered-div">
							<div classsName="range-wrapper">
								<h3>{(this.state.closestSize && `Size of a ${this.state.closestSize.name}  [${this.getSizeString(this.state.closestSize.size)}]`) || 'Select Size'}</h3>
								<Form.Label style={{color:'whitesmoke'}}>{this.getCurrentSizeString()}</Form.Label>
								<Form.Range max={1000} value={this.state.sizeRangeValue} onChange={(event) => this.handleSizeChange(event.target.value)} />
							</div>
							{/* <div classsName="range-wrapper">
								<h3>{(this.state.closestMass && `Mass of a ${this.state.closestMass.name}  [${this.state.closestMass.mass} kg]`) || 'Select Mass'}</h3>
								<Form.Label style={{color:'whitesmoke'}}>{this.getCurrentMassString()}</Form.Label>
								<Form.Range max={5000} value={this.state.massRangeValue} onChange={(event) => this.handleMassChange(event.target.value)} />
							</div> */}
							<div classsName="range-wrapper">
								<h3>{(this.state.closestDensity && `Density of a ${this.state.closestDensity.name}  [${this.state.closestDensity.density} g/cm]`) || 'Select Density'}</h3>
								<Form.Label style={{color:'whitesmoke'}}>{this.getCurrentDensityString()}</Form.Label>
								<Form.Range max={800} value={this.state.densityRangeValue} onChange={(event) => this.handleDensityChange(event.target.value)} />
							</div>
						</Col>
					</Row>
					<Row>
						<Col className="centered-div">
								{this.state.closestMass && <h2>Mass of a: {this.state.closestMass.name + ': ' + this.state.closestMass.mass + 'kg'}</h2>}
								<h4 style={{ paddingTop: '15px', color: 'whitesmoke' }}>{(this.state.xalianSpeciesRefLow && `Bigger than ${this.state.xalianSpeciesRefLow.name} [${this.state.xalianSpeciesRefLow.height}]`) || ' '}</h4>
								<h4 style={{ paddingBottom: '15px', color: 'whitesmoke' }}>{(this.state.xalianSpeciesRefHigh && `Smaller than ${this.state.xalianSpeciesRefHigh.name} [${this.state.xalianSpeciesRefHigh.height}]`) || ' '}</h4>
						</Col>
					</Row>
					<Row>
						<Col className="centered-div">
							{this.state.closestSize && (
								<React.Fragment>
									<h2>Languages:</h2>
									<div className="scrollable-section" style={{ maxHeight: '150px', border: 'solid 1px whitesmoke', borderRadius: '4px', padding: '4px' }} >{this.getListOfTranslations(this.state.closestSize)}</div>
								</React.Fragment>
							)}
						</Col>
					</Row>
					<Row>
						<Col className="centered-div">
							<Form.Select onChange={(event) => this.handlePlanetChange(event.target.value)}>
								<option>Select Origin Planet</option>
								{this.state.planetOptions}
							</Form.Select>
						</Col>
						<Col>{this.state.selectedPlanet && <img style={{ maxWidth: '200px', maxHeight: '200px', height: 'auto', width: 'auto' }} src={this.state.selectedPlanet.planetImage} class="planet-gif" alt=""></img>}</Col>
					</Row>
				</Row>
			</div>
		);
	}
}

export default SpeciesDesignerSizeSelector;
