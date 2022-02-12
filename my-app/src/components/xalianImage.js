
import React from 'react';
import Image from 'react-bootstrap/Image'

class XalianImage extends React.Component {

    
    getImageLocationFromSpecies(name) {
        return `/assets/img/xalians/xalians_icon_${name.toLowerCase()}.png`;
    }

    getTypeColorClassName(type) {
        var x = this.props.colored ? ` ${type.toLowerCase()}-color ` : '';
        x = x + (this.props.bordered ? ` xalian-image-bordered ` : '');
        x = x + (this.props.moreClasses);
        return x;
    }

    render() {
        return <Image src={this.getImageLocationFromSpecies(this.props.speciesName)} rounded className={"xalian-image " + this.getTypeColorClassName(this.props.speciesType)} />
    }

}

export default XalianImage;