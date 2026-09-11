import { Auth } from '@aws-amplify/auth';
import * as authUtil from './authUtil';
import * as dbApi from '../utils/dbApi';
import mockUserData from '@xalians/content/mock/mockUserData.json';
import xalianSamples from '@xalians/content/mock/xalianSamples.json';

// resolves with the caller's user record when signed in, or null when signed out;
// rejects if the API call itself fails.
//
// The record no longer carries creatures (issue #180 retired the legacy XalianTable);
// a caller's creatures are ratified records from dbApi.callListXalians. The duel's
// squad picker still reads the old shape and simply falls back to random squads when
// it is absent, until its derivation layer over the record lands (#184).
export function getCurrentUserAndXalians() {
    return Auth.currentUserInfo().then((data) => {
        if (!data) {
            return null;
        }
        let u = authUtil.buildAuthState(data);
        return dbApi.callGetUser(u.username);
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
