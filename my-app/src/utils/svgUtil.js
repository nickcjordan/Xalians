import * as constants from '../constants/colorConstants';
import gsap from 'gsap';

import { ReactComponent as AirSymbolSVG } from '../svg/symbols/air_symbol.svg';
import { ReactComponent as WaterSymbolSVG } from '../svg/symbols/water_symbol.svg';
import { ReactComponent as FireSymbolSVG } from '../svg/symbols/fire_symbol.svg';
import { ReactComponent as PlantSymbolSVG } from '../svg/symbols/plant_symbol.svg';
import { ReactComponent as GhostSymbolSVG } from '../svg/symbols/ghost_symbol.svg';
import { ReactComponent as PsychicSymbolSVG } from '../svg/symbols/psychic_symbol.svg';
import { ReactComponent as MetalSymbolSVG } from '../svg/symbols/metal_symbol.svg';
import { ReactComponent as ChemicalSymbolSVG } from '../svg/symbols/chemical_symbol.svg';
import { ReactComponent as LightSymbolSVG } from '../svg/symbols/light_symbol.svg';
import { ReactComponent as DarkSymbolSVG } from '../svg/symbols/dark_symbol.svg';
import { ReactComponent as RockSymbolSVG } from '../svg/symbols/rock_symbol.svg';
import { ReactComponent as IceSymbolSVG } from '../svg/symbols/ice_symbol.svg';
import { ReactComponent as SandSymbolSVG } from '../svg/symbols/sand_symbol.svg';
import { ReactComponent as ElectricSymbolSVG } from '../svg/symbols/electric_symbol.svg';

export const getSpeciesTypeSymbol = (type, fillTypeColor = false, size = 30, classes = "") => {
    var typeColor = fillTypeColor ? constants.themeColors[type.toLowerCase()] : '#000000';
     
	let elem = getSpeciesTypeSymbolSVG(type, typeColor, size, classes);
    // classes.forEach((c) => {
    //     gsap.set(element, {className: c});
    // });
    // if (fillTypeColor) {
    //     let color = constants[type.toLowerCase()];
    //     gsap.set(elem, {fill: color});
    // }
    return elem;
};

export const getSpeciesTypeSymbolSVG = (type, typeColor, size, classes) => {
    if (type.toLowerCase() == 'air') { return <AirSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'water') { return <WaterSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'fire') { return <FireSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'plant') { return <PlantSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'ghost') { return <GhostSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'psychic') { return <PsychicSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'metal') { return <MetalSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'chemical') { return <ChemicalSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'light') { return <LightSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'dark') { return <DarkSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'rock') { return <RockSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'ice') { return <IceSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'sand') { return <SandSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
    if (type.toLowerCase() == 'electric') { return <ElectricSymbolSVG style={{ fill: typeColor,  width: `${size}px`, height: `${size}px`, maxWidth: `${size}px !important`, maxHeight: `${size}px !important` }} className={classes} /> };
};


export const getStripedBackgroundImage = (fillColor = '#9C92AC', fillOpacity = 0.4) => {
    let translatedFillVal = fillColor.replace('#', '');
    // return `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23${translatedFillVal}' fill-opacity='${fillOpacity}' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`;
    return `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23${translatedFillVal}' fill-opacity='${fillOpacity}' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`;
}
