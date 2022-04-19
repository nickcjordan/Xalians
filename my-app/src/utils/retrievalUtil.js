import { Auth } from 'aws-amplify';
import * as authUtil from './authUtil';
import * as dbApi from '../utils/dbApi';
import mockUserData from '../json/mock/mockUserData.json'
import mockXalianList from '../json/mock/mockXalianList.json'

export function getCurrentUserAndXalians() {
    return new Promise((resolve) => {
        try {
            Auth.currentUserInfo().then((data) => {
                if (data) {
                    let u = authUtil.buildAuthState(data);
                    let username = u.username;
                    dbApi
                    .callGetUser(username, true)
                    .then((user) => {
                        console.log(JSON.stringify(user, null, 2));
                        resolve(user);
                    })
                    .catch((e) => {
                       console.log(`ERROR : ${JSON.stringify(e, null, 2)}`);
                    });
                }
            });
        } catch (e) {
          console.log("caught ERROR : " + e);
        }
      });
    
}

export function getMockCurrentUserAndXalians() {
    return new Promise((resolve) => {
        resolve(mockUserData);
    });
    
}

export function getMockXalianList() {
    return mockXalianList;
}