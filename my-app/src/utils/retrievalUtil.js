import { Auth } from 'aws-amplify';
import * as authUtil from './authUtil';
import * as dbApi from '../utils/dbApi';

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