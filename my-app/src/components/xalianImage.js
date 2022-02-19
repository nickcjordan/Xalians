
import React from 'react';
import Image from 'react-bootstrap/Image'
import * as constants from '../constants/constants'
// import * as constants from '../svg/constants'
import XalianSVG from './xalianSVG'


class XalianImage extends React.Component {

    
    getImageLocationFromSpecies(name) {
        // return `/assets/img/xalians/xalians_icon_${name.toLowerCase()}.png`;
        // return `../svg/${name.toLowerCase()}.svg`;
        return require(`../svg/${name.toLowerCase()}.svg`)?.default;
    }

    getTypeColorClassName(type) {
        var x = this.props.colored ? ` ${type.toLowerCase()}-color ` : '';
        x = x + (this.props.bordered ? ` xalian-image-bordered ` : '');
        x = x + (this.props.shadowed ? ' xalian-image-shadowed ' : '');
        x = x + (this.props.moreClasses);
        return x;
    }

    render() {
        console.log('constants = ' + JSON.stringify(constants.themeColors['air'], null, 2));
        for (const item in constants.themeColors) {
            console.log(`${item} : ${constants.themeColors[item]}`)

          }
        if (this.props.secondaryType) {
            let primaryColor = constants.themeColors[this.props.primaryType.toLowerCase()];
            let secondaryColor = constants.themeColors[this.props.secondaryType.toLowerCase()];
            return <Image style={{ background: `linear-gradient(135deg, ${primaryColor} 15%, ${secondaryColor} 85%)` }} src={this.getImageLocationFromSpecies(this.props.speciesName)} rounded className={"xalian-image " + this.getTypeColorClassName(this.props.primaryType)} />
        } else {
            return <Image style={{ background: `radial-gradient(circle, ${constants.themeColors[this.props.primaryType.toLowerCase()]} 60%, ${constants.themeColors[this.props.primaryType.toLowerCase()] + '85'} 100%)` }} src={this.getImageLocationFromSpecies(this.props.speciesName)} rounded className={"xalian-image " + this.getTypeColorClassName(this.props.primaryType)} />
            // return <XalianSVG style={{ background: `radial-gradient(circle, ${constants.themeColors[this.props.primaryType.toLowerCase()]} 60%, ${constants.themeColors[this.props.primaryType.toLowerCase()] + '85'} 100%)` }} src={this.getImageLocationFromSpecies(this.props.speciesName)} rounded className={"xalian-image " + this.getTypeColorClassName(this.props.primaryType)} 
            // />
        }
        // <SVG fill="rgba(0, 0, 0, 0.7)" className="section-top-scene" ></SVG>
    }

}

export default XalianImage;