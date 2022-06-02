import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import species from '../../json/species.json';
import XalianImage from '../../components/xalianImage';
import * as translater from '../../utils/valueTranslator';
import fitty from 'fitty';
import * as constants from '../../constants/colorConstants';
import * as styleUtil from '../../utils/styleUtil';

class XalianSpeciesSizeComparisonView extends React.Component {
	state = {
		speciesList: [],
		width: 0,
		height: 0,
		max: 0,
		min: 0,
	};

    


	componentDidMount() {
        this.setSpeciesContent();

        let fits = fitty('.species-compare-text');
        // fits.forEach( fit => {
        //     console.log(fit);
        // })

        let scrollContainer = document.getElementById("species-compare-box");
        scrollContainer.addEventListener("wheel", (event) => {
            event.preventDefault();
            scrollContainer.scrollLeft += event.deltaY;
         });
	}

    componentDidUpdate() {
        // fitty.fitAll();
    }



    setSpeciesContent = () => {
        let s = species;
        s.forEach(element => {
            element.size = this.getHeight(element);
            element.heightString = translater.translateHeightString(element.height);
        })
		s.sort(this.compareSize);
		let maxSize = s[s.length - 1].size;
		let minSize = s[0].size;
		// let screenSize = Math.min(this.getContainerWidth(), this.getContainerHeight());
		let sizeRatioA = this.props.size.min / maxSize;
		let sizeRatioB = (this.props.size.min * 0.05) / minSize;
		let sizeRatio = Math.max(sizeRatioA, sizeRatioB);
		let list = [];
		s.forEach((element) => {
			list.push(this.buildSpeciesImage(element, sizeRatio));
		});
		this.setState({ speciesList: list });
    }

	compareSize = (x, y) => {
		let diff = this.getHeight(x) - this.getHeight(y);
		return diff == 0 ? this.getWeight(x) - this.getWeight(y) : diff;
	};

	getHeight = (s) => {
		return s.height.split('/')[1].trim().replace(' cm', '');
	};

	getWeight = (s) => {
		return s.weight.split('/')[1].trim().replace(' kg', '');
	};

    getMaxHeight = () => {
        return this.getContainerHeight() - this.getTextSpace() - 30; // -30 for scroll bar
    }

    getContainerHeight = () => {
        return this.props.size.height;
    }

    getContainerWidth = () => {
        return this.props.size.width;
    }

    getTextSpace = () => {
        return 100;
    }

	buildSpeciesImage = (x, sizeRatio) => {
        let spaceToLeaveForSpeciesText =  this.getTextSpace();
        let color = constants.themeColors[x.type.toLowerCase()];
        let minSizeForWholeWrapper = 150;

		return (
			<React.Fragment>
				<div className="species-compare-whole-wrapper" style={{ width: x.size * sizeRatio, height: x.size * sizeRatio + spaceToLeaveForSpeciesText, minWidth: Math.max(minSizeForWholeWrapper, x.size * sizeRatio) }}>
					<div className="species-compare-image-wrapper" style={{ width: x.size * sizeRatio, height: x.size * sizeRatio }}>
						<a href={'/species/' + x.id}>
							<XalianImage unPadded speciesName={x.name} primaryType={x.type} moreClasses="" className="species-compare-xalian-image" />
						</a>
					</div>
					<div className="species-compare-text-row-wrapper" style={{width: Math.max(minSizeForWholeWrapper, x.size * sizeRatio), height: spaceToLeaveForSpeciesText}}>
						<Row className="species-compare-species-name" >
							<h5 style={{ textShadow: styleUtil.textBorder('black', 2) + ', ' + styleUtil.getBorder(x.type.toLowerCase(), 8, 12), color: '#ffffffff' }} className="condensed-row species-compare-text fit">{x.name}</h5>
						</Row>
						<Row >
							<h6 className="condensed-row species-compare-text fit">{x.heightString}</h6>
						</Row>
						<Row >
							<h6 className="condensed-row species-compare-text fit">{x.weight}</h6>
						</Row>
					</div>
				</div>
			</React.Fragment>
		);
	};

	render() {

		return (
			<React.Fragment>
				<div id="species-compare-box" className="species-compare-box">{this.state.speciesList}</div>
			</React.Fragment>
		);
	}
}

export default XalianSpeciesSizeComparisonView;
