import React, { useRef } from 'react';
import SVG, { Props as SVGProps } from 'react-inlinesvg';

import { ReactComponent as XylumSVG } from './xylum.svg';
import { ReactComponent as DromeusSVG } from './dromeus.svg';
import { ReactComponent as TetrahiveSVG } from './tetrahive.svg';
import { ReactComponent as BioflimSVG } from './bioflim.svg';
import { ReactComponent as SmokatSVG } from './smokat.svg';
import { ReactComponent as NewtapedeSVG } from './newtapede.svg';
import { ReactComponent as VoltishSVG } from './voltish.svg';
import { ReactComponent as TizzieSVG } from './tizzie.svg';
import { ReactComponent as CrystornSVG } from './crystorn.svg';
import { ReactComponent as LucerasSVG } from './luceras.svg';
import { ReactComponent as CodazzoSVG } from './codazzo.svg';
import { ReactComponent as FigzySVG } from './figzy.svg';
import { ReactComponent as ForomeerSVG } from './foromeer.svg';
import { ReactComponent as VenemistSVG } from './venemist.svg';
import { ReactComponent as KosanosSVG } from './kosanos.svg';
import { ReactComponent as ImpritSVG } from './imprit.svg';
import { ReactComponent as ScalattoSVG } from './scalatto.svg';
import { ReactComponent as AkinzaSVG } from './akinza.svg';
import { ReactComponent as AvililySVG } from './avilily.svg';
import { ReactComponent as ThirstaserpSVG } from './thirstaserp.svg';
import { ReactComponent as GraviclawSVG } from './graviclaw.svg';
import { ReactComponent as YetimothSVG } from './yetimoth.svg';
import { ReactComponent as ChromocatSVG } from './chromocat.svg';
import { ReactComponent as EctoghoulSVG } from './ectoghoul.svg';
import { ReactComponent as HippochampSVG } from './hippochamp.svg';
import { ReactComponent as NephSVG } from './neph.svg';
import { ReactComponent as TerragoyleSVG } from './terragoyle.svg';
import { ReactComponent as HypnopetSVG } from './hypnopet.svg';
import { ReactComponent as DrilltailSVG } from './drilltail.svg';




class XalianSVG extends React.Component {

    // render() {
    //         const elem = require(`./${this.props.name}.svg`).default;
    //     return (<React.Fragment>
    //         {elem &&
    //             <SVG src={elem} onError={(error) => console.log(error.message)} style={this.props.style} className={this.props.className}/>
    //         }
    //     </React.Fragment>
    //     );
    // }

    render() {
        let speciesName = this.props.name;
        if (speciesName == 'xylum') { return <XylumSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'dromeus') { return <DromeusSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'tetrahive') { return <TetrahiveSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'bioflim') { return <BioflimSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'smokat') { return <SmokatSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'newtapede') { return <NewtapedeSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'voltish') { return <VoltishSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'tizzie') { return <TizzieSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'crystorn') { return <CrystornSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'luceras') { return <LucerasSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'codazzo') { return <CodazzoSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'figzy') { return <FigzySVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'foromeer') { return <ForomeerSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'venemist') { return <VenemistSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'kosanos') { return <KosanosSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'imprit') { return <ImpritSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'scalatto') { return <ScalattoSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'akinza') { return <AkinzaSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'avilily') { return <AvililySVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'thirstaserp') { return <ThirstaserpSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'graviclaw') { return <GraviclawSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'yetimoth') { return <YetimothSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'chromocat') { return <ChromocatSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'ectoghoul') { return <EctoghoulSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'hippochamp') { return <HippochampSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'neph') { return <NephSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'terragoyle') { return <TerragoyleSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'hypnopet') { return <HypnopetSVG style={this.props.style} className={this.props.className} /> }
        if (speciesName == 'drilltail') { return <DrilltailSVG style={this.props.style} className={this.props.className} /> }
        else {
            const elem = require(`./${this.props.name}.svg`).default;
                    return (<React.Fragment>
            {elem &&
                <SVG src={elem} onError={(error) => console.log(error.message)} style={this.props.style} className={this.props.className}/>
            }
        </React.Fragment>
        )}
    }
}



export default XalianSVG;