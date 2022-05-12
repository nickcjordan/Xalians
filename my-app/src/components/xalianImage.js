import React from 'react';
import Image from 'react-bootstrap/Image';
import * as constants from '../constants/colorConstants';
import XalianSVG from '../svg/species/xalianSvg';
// import * as constants from '../svg/constants'

class XalianImage extends React.Component {
	getImageLocationFromSpecies(name) {
		return require(`../svg/species/${name.toLowerCase()}.svg`)?.default;
	}

	getTypeColorClassName(type) {
		var x = this.props.colored ? ` ${type.toLowerCase()}-color ` : '';
		x = x + (this.props.bordered ? ` xalian-image-bordered ` : '');
		x = x + (this.props.selected ? ` xalian-image-selected ` : '');
		x = x + (this.props.shadowed ? ' xalian-image-shadowed ' : '');
		x = x + (!this.props.unPadded ? ' xalian-image-wrapper-padded ' : '');
		x = x + this.props.moreClasses;
		return x;
	}

	buildXalian = () => {
		return <XalianSVG 
			name={this.props.speciesName.toLowerCase()} className={'xalian-image'} 
			style={{ 
				padding: this.props.padding || '2%', 
				fill: this.props.fill || 'black',
				stroke: this.props.stroke || '0',
				strokeWidth: this.props.strokeWidth,
				strokeLinecap: 'round',
				filter: this.props.filter
			}} 
		/>;
	} 

	render() {
		let xalian = this.buildXalian();
		if (this.props.secondaryType) {
			let primaryColor = constants.themeColors[this.props.primaryType.toLowerCase()];
			let secondaryColor = constants.themeColors[this.props.secondaryType.toLowerCase()];
			let builtClasses = this.getTypeColorClassName(this.props.primaryType);
			if (this.props.colored) {
				return (
					<div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses} style={{ background: `linear-gradient(135deg, ${primaryColor} 15%, ${secondaryColor} 85%)` }}>
						{/* {this.props.lazy && <img data-src={this.getImageLocationFromSpecies(this.props.speciesName)} className={'xalian-image lazyload'} />} */}
						{/* {!this.props.lazy && <Image src={this.getImageLocationFromSpecies(this.props.speciesName)} className={'xalian-image'} style={{ padding: this.props.padding || '5px' }} />} */}
						{xalian}
					</div>
				);
			} else {
				return (
					<div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses}>
						{/* {this.props.lazy && <img data-src={this.getImageLocationFromSpecies(this.props.speciesName)} className={'xalian-image lazyload'} />} */}
						{/* {!this.props.lazy && <Image src={this.getImageLocationFromSpecies(this.props.speciesName)} className={'xalian-image'}  style={{ padding: this.props.padding || '5px' }} />} */}
						{/* <XalianSVG name={this.props.speciesName.toLowerCase()} className={'xalian-image'}  style={{ padding: this.props.padding || '5px' }} /> */}
						{xalian}
					</div>
				);
			}
		} else {
			let primaryColor = constants.themeColors[this.props.primaryType.toLowerCase()];
			let builtClasses = this.getTypeColorClassName(this.props.primaryType);
			if (this.props.colored) {
				return (
					<div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses} style={{ background: `radial-gradient(circle, ${primaryColor} 65%, ${primaryColor + '90'} 100%)` }}>
						{/* {this.props.lazy && <img data-src={this.getImageLocationFromSpecies(this.props.speciesName)} className="xalian-image lazyload" />} */}
						{/* {!this.props.lazy && <Image src={this.getImageLocationFromSpecies(this.props.speciesName)} className="xalian-image"  style={{ padding: this.props.padding || '5px' }} />} */}
						{/* <XalianSVG name={this.props.speciesName.toLowerCase()} className="xalian-image"  style={{ padding: this.props.padding || '5px' }} /> */}
						{xalian}
					</div>
				);
			} else {
				return (
					<div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses}>
						{/* {this.props.lazy && <img data-src={this.getImageLocationFromSpecies(this.props.speciesName)} className="xalian-image lazyload" />} */}
						{/* {!this.props.lazy && <Image src={this.getImageLocationFromSpecies(this.props.speciesName)} className="xalian-image" style={{ padding: this.props.padding || '5px' }}  />} */}
						{/* <XalianSVG name={this.props.speciesName.toLowerCase()} className="xalian-image" style={{ padding: this.props.padding || '5px' }}  /> */}
						{xalian}
					</div>
				);
			}
		}
	}
}

export default XalianImage;
