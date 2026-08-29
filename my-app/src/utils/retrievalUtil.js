import { Auth } from 'aws-amplify';
import * as authUtil from './authUtil';
import * as dbApi from '../utils/dbApi';
import mockUserData from '../json/mock/mockUserData.json';
import mockXalianList from '../json/mock/mockXalianList.json';
import xalianSamples from '../json/mock/xalianSamples.json';

// resolves with the user record (xalians populated) when signed in, or null when signed out;
// rejects if the API call itself fails
export function getCurrentUserAndXalians() {
    return Auth.currentUserInfo().then((data) => {
        if (!data) {
            return null;
        }
        let u = authUtil.buildAuthState(data);
        return dbApi.callGetUser(u.username, true);
    });
}

export function getMockCurrentUserAndXalians() {
    return new Promise((resolve) => {
        resolve(mockUserData);
    });
    
}

export function getMockXalianList() {
    // let selected = [];
    // selected.push(xalianSamples[(parseInt(Math.round(xalianSamples.length * Math.random())))]);
    // selected.push(xalianSamples[(parseInt(Math.round(xalianSamples.length * Math.random())))]);
    // selected.push(xalianSamples[(parseInt(Math.round(xalianSamples.length * Math.random())))]);
    // selected.push(xalianSamples[(parseInt(Math.round(xalianSamples.length * Math.random())))]);
    // return selected;
    return xalianSamples;
    // return mockXalianList;
}
