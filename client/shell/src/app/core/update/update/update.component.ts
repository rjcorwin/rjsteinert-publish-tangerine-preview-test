import { Component, OnInit } from '@angular/core';
import { WindowRef } from '../../window-ref.service';
import { TangyFormService } from '../../../tangy-forms/tangy-form-service';
import { updates } from './updates';
import PouchDB from 'pouchdb';
import { TangerineFormPage } from '../../../../../e2e/app.po';

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.css']
})
export class UpdateComponent implements OnInit {

  constructor(
    private windowRef: WindowRef
  ) { }

  async ngOnInit() {
    let window = this.windowRef.nativeWindow
    let usersDb = new PouchDB('users');
    const response = await usersDb.allDocs({include_docs: true});
    const usernames = response
      .rows
      .map(row => row.doc)
      .filter(doc => doc.hasOwnProperty('username'))
      .map(doc => doc.username);
    for (let username of usernames) {
      let userDb = await new PouchDB(username);
      let infoDoc = await userDb.get('info');
      let atUpdateIndex = infoDoc.hasOwnProperty('atUpdateIndex') ? infoDoc.atUpdateIndex : 0;
      let lastUpdateIndex = updates.length-1
      if (lastUpdateIndex !== atUpdateIndex) {
        let requiresViewsRefresh = false;
        while(lastUpdateIndex >= atUpdateIndex) {
          if (updates[atUpdateIndex].requiresViewsUpdate) {
            requiresViewsRefresh = true
          }
          await updates[atUpdateIndex].script(userDb);
          atUpdateIndex++;
        }
        atUpdateIndex--;
        if (requiresViewsRefresh) {
          let tangyFormService = new TangyFormService(username)
          await tangyFormService.initialize();
        }
        infoDoc.atUpdateIndex = atUpdateIndex;
        await userDb.put(infoDoc);
      }

    }
  }

}
