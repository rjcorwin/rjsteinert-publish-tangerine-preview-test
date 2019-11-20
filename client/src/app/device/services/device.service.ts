import { Device } from './../classes/device.class';
import { PouchDB } from 'pouchdb';
import { AppConfigService } from './../../shared/_services/app-config.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

const TANGERINE_DEVICE_STORE = 'TANGERINE_DEVICE_STORE'
const TANGERINE_DEVICE_DOC = 'TANGERINE_DEVICE_DOC'

class TangerineDeviceDoc {
  _id = TANGERINE_DEVICE_DOC
  device:Device
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  db = new PouchDB(TANGERINE_DEVICE_STORE)

  constructor(
    private http:HttpClient,
    private appConfigService:AppConfigService
  ) { }

  async install() {
    await this.db.put({
      _id: TANGERINE_DEVICE_DOC
    })
  }

  async uninstall() {
    await this.db.destroy()
  }

  async register(token):Promise<Device> {
    const appConfig = await this.appConfigService.getAppConfig()
    const tangerineDeviceDoc = <TangerineDeviceDoc>await this.db.get(TANGERINE_DEVICE_DOC)
    const device = <Device>await this
      .http
      .get(`${appConfig.homeUrl}api/${appConfig.groupName}/devices-by-token/${token}`).toPromise() 
    await this.db.put({
      ...tangerineDeviceDoc,
      device
    })
    return device
  }

  async getDevice():Promise<Device> {
    return (<TangerineDeviceDoc>await this.db.get(TANGERINE_DEVICE_DOC)).device
  }

  async updateDevice():Promise<Device> {
    const appConfig = await this.appConfigService.getAppConfig()
    const tangerineDeviceDoc = <TangerineDeviceDoc>await this.db.get(TANGERINE_DEVICE_DOC)
    const device = <Device>await this
      .http
      .get(`${appConfig.homeUrl}api/${appConfig.groupName}/devices-by-token/${tangerineDeviceDoc.device.token}`).toPromise() 
    await this.db.put({
      ...tangerineDeviceDoc,
      device
    })
    return device
  }


}
