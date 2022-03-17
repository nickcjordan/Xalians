import React from 'react';
import Image from 'react-bootstrap/Image';
import * as constants from '../constants/constants';
// import * as constants from '../svg/constants'
import XalianSVG from './xalianSVG';

class XalianImage extends React.Component {
	getImageLocationFromSpecies(name) {
		return require(`../svg/species/${name.toLowerCase()}.svg`)?.default;
	}

    getTypeColorClassName(type) {
		var x = this.props.colored ? ` ${type.toLowerCase()}-color ` : '';
		x = x + (this.props.bordered ? ` xalian-image-bordered ` : '');
		x = x + (this.props.shadowed ? ' xalian-image-shadowed ' : '');
		x = x + (!this.props.unPadded ? ' xalian-image-wrapper-padded ' : '');
		x = x + this.props.moreClasses;
		return x;
	}

	render() {
		if (this.props.secondaryType) {
			let primaryColor = constants.themeColors[this.props.primaryType.toLowerCase()];
			let secondaryColor = constants.themeColors[this.props.secondaryType.toLowerCase()];
            let builtClasses = this.getTypeColorClassName(this.props.primaryType);
			if (this.props.colored) {
				return (
					<div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses} style={{ background: `linear-gradient(135deg, ${primaryColor} 15%, ${secondaryColor} 85%)` }}>
						<Image src={this.getImageLocationFromSpecies(this.props.speciesName)} className={'xalian-image'} />
					</div>
				);
			} else {
				return (
					<div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses}>
						<Image src={this.getImageLocationFromSpecies(this.props.speciesName)} className={'xalian-image'} />
					</div>
				);
			}
			
		} else {
            let primaryColor = constants.themeColors[this.props.primaryType.toLowerCase()];
            let builtClasses = this.getTypeColorClassName(this.props.primaryType);
			if (this.props.colored) {
				return (
					<div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses} style={{ background: `radial-gradient(circle, ${primaryColor} 60%, ${primaryColor + '85'} 100%)` }} >
						<Image src={this.getImageLocationFromSpecies(this.props.speciesName)} className='xalian-image'/>
					</div>
				);
			} else {
				return (
					<div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses}>
						<Image src={this.getImageLocationFromSpecies(this.props.speciesName)} className='xalian-image'/>
					</div>
				);
			}
			
		}
	}
}

export default XalianImage;
