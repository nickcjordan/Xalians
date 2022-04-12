import React from 'react';
import Image from 'react-bootstrap/Image';
import {gsap} from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ReactComponent as XaliansLogoSVG } from '../../../svg/logo/xalians_logo_x.svg';
import { Hub } from "aws-amplify";
import { useState, useEffect } from 'react';

gsap.registerPlugin(DrawSVGPlugin);

class GameTimer extends React.Component {

    componentDidMount() {
        Hub.listen("game-timer", (data) => {
            const type = data.payload.event;
            const req = data.payload.data;
            if (type == "start-timer") {
              
            } else if (type == "hide-alert") {
              this.setState({ isShowing: false });
            } else if (type == "show-alert") {
              this.setState({ isShowing: true });
            }
          });
        }

        // Hub.dispatch("alert", { event: "hide-alert", data: null, message: null });
    }

	render() {
            return (
                
            );
	}
}

export default GameTimer;
