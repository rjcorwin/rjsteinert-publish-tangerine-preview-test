import {Component, OnInit} from '@angular/core';
import {UserService} from '../../../shared/_services/user.service';
import {SyncingService} from '../../sync-records/_services/syncing.service';
import {_TRANSLATE} from '../../../shared/translation-marker';
import {AppConfigService} from '../../../shared/_services/app-config.service';
import {DB} from '../../../shared/_factories/db.factory'
import {ReplicationStatus} from "../../../sync/classes/replication-status.class";

const SHARED_USER_DATABASE_NAME = 'shared-user-database';
const SHARED_USER_DATABASE_INDEX_NAME = 'shared-user-database-index';
const USERS_DATABASE_NAME = 'users';
const LOCKBOX_DATABASE_NAME = 'tangerine-lock-boxes';
const VARIABLES_DATABASE_NAME = 'tangerine-variables';

declare const cordova: any;

@Component({
  selector: 'app-export-data',
  templateUrl: './export-data.component.html',
  styleUrls: ['./export-data.component.css']
})
export class ExportDataComponent implements OnInit {

  window: any;
  statusMessage: string
  progressMessage: string
  errorMessage: string
  backupDir: string = 'Documents/Tangerine/backups/'
  DEFAULT_BATCH_SIZE = 50;
  LIMIT = 5000;
  SPLIT = 50
  dirHandle
  fileHandle

  constructor(
    private userService: UserService,
    private syncingService: SyncingService,
    private appConfigService: AppConfigService
  ) {
    this.window = window;
  }

  ngOnInit() {
    this.statusMessage = ''
    this.progressMessage = ''
    this.errorMessage = ''

    if (this.window.isCordovaApp) {
      this.backupDir = 'Documents/Tangerine/backups/'
    } else {
      this.backupDir = `${_TRANSLATE('Click button to start download to desired directory.')} `
    }

    if (this.window.isCordovaApp) {
      this.window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory + 'Documents', (directoryEntry) => {
        directoryEntry.getDirectory('Tangerine', {create: true}, (dirEntry) => {
          dirEntry.getDirectory('backups', {create: true}, (subDirEntry) => {
          }, this.onErrorGetDir);
          dirEntry.getDirectory('restore', {create: true}, (subDirEntry) => {
          }, this.onErrorGetDir);
        }, this.onErrorGetDir);
      })
    }
  }

  async exportAllRecords() {
    this.statusMessage = ''
    this.progressMessage = ''
    this.errorMessage = ''
    const appConfig = await this.appConfigService.getAppConfig()
    const dbNames = [SHARED_USER_DATABASE_NAME, SHARED_USER_DATABASE_INDEX_NAME, USERS_DATABASE_NAME, LOCKBOX_DATABASE_NAME, VARIABLES_DATABASE_NAME]
    // APK's that use in-app encryption
    if (window['isCordovaApp'] && appConfig.syncProtocol === '2' && !window['turnOffAppLevelEncryption']) {
      const backupLocation = cordova.file.externalRootDirectory + this.backupDir;
      for (const dbName of dbNames) {
        // copy the database
        console.log(`copying ${dbName} db over to the user accessible fs`)
        // tslint:disable-next-line:max-line-length
        this.window.resolveLocalFileSystemURL(cordova.file.applicationStorageDirectory + 'databases/' + dbName, (fileEntry) => {
          this.window.resolveLocalFileSystemURL(backupLocation, (directory) => {
            fileEntry.copyTo(directory, dbName, () => {
              console.log('DB Copied!');
              // alert(`${_TRANSLATE('File Stored At')} ${cordova.file.externalDataDirectory}${dbName}`);
              this.statusMessage += `<p>${_TRANSLATE('DB Copied to ')} ${cordova.file.externalDataDirectory}${dbName}</p>`
            }, (e) => {
              console.log('Unable to copy DB');
              alert(`${_TRANSLATE('Write Failed: ')}` + e.toString());
            });
          }, null);
        }, null);
      }
    } else {
      // APK's or PWA's that do not use in-app encryption - have turnOffAppLevelEncryption:true in app-config.json
      for (let index = 0; index < dbNames.length; index++) {
        const dbName = dbNames[index]
        // copy the database
        console.log(`exporting ${dbName} db over to the user accessible fs`)
        const db = DB(dbName)
        const now = new Date();
        const fileName =
          `${dbName}_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.json`;
        if (this.window.isCordovaApp) {
          const backupLocation = cordova.file.externalRootDirectory + this.backupDir;
          function onErrorDir(e) {
            console.log("Error: " + e)
            let errorMessage
            if (e && e.code && e.code === 1) {
              errorMessage = "File or directory not found."
            } else {
              errorMessage = e
            }
            this.errorMessage += `<p>${_TRANSLATE('Error with dir: ')} ${dbName} ${_TRANSLATE(' at backup location: ')} ${backupLocation}  ${_TRANSLATE(' Error: ')} ${errorMessage}</p>`
          }

          this.window.resolveLocalFileSystemURL(backupLocation, (directoryEntry) => {
            // first delete dir
            this.progressMessage = `<p>${_TRANSLATE('Deleting old backup directory at ')} ${backupLocation}${dbName} </p>`
            directoryEntry.getDirectory(dbName, {create: false}, function (subDirEntry) {
              subDirEntry.removeRecursively(function () {
                console.log(`${_TRANSLATE('Deleted old data directory at ')} ${backupLocation}${dbName}`);
              }, onErrorDir)
            })
          })

          let dumpOpts = {
            batch_size: 100 // decent default for good performance
          };

          const splitBatches = Math.max(1, Math.floor(this.SPLIT / 10))
          console.log("batch_size: " + splitBatches)
          dumpOpts.batch_size = splitBatches

          let numFiles = 0;
          let numDocsInBatch = 0;
          let out = [];
          let header;
          let first = true;

          const splitPromises = [];

          function createSplitFileName() {
            let numStr = numFiles.toString();
            while (numStr.length < 8) {
              numStr = '0' + numStr;
            }
            // if the filename is e.g. foo.txt, return
            // foo_00000000.txt
            // else just foo_00000000
            const match = fileName.match(/\.[^\.]+$/);
            if (match) {
              return fileName.replace(/\.[^\.]+$/, '_' + numStr + match[0]);
            } else {
              return fileName + '_' + numStr;
            }
          }

          async function dumpToSplitFile(that) {

            const suggestedName = createSplitFileName()

            that.window.resolveLocalFileSystemURL(backupLocation, (directoryEntry) => {

              // create backup dir
              directoryEntry.getDirectory(dbName, {create: true}, function (subDirEntry) {
                that.progressMessage = `<p>${_TRANSLATE('Created directory at ')} ${backupLocation}${dbName} </p>`
                subDirEntry.getFile(suggestedName, {create: true, exclusive: false}, (fileEntry) => {
                  fileEntry.createWriter((fileWriter) => {
                    fileWriter.onwriteend = (data) => {
                      that.progressMessage = `<p>${_TRANSLATE('Backup stored At')} ${backupLocation}${dbName}/${fileName} </p>`
                    };
                    fileWriter.onerror = (e) => {
                      alert(`${_TRANSLATE('Write Failed')}` + e.toString());
                      that.errorMessage += `<p>${_TRANSLATE('Write Failed')}` + e.toString() + "</p>"
                    };
                    const stringOutput = header + out.join()
                    fileWriter.write(stringOutput);
                    // const message = `<p>${_TRANSLATE('Backup stored At')} ${backupLocation}${dbName}/${fileName} </p>`
                    // console.log(message)
                    // that.progressMessage = message
                  });
                });
              }, onErrorDir);

            }, (e) => {
              console.log("Error: " + e)
              let errorMessage
              if (e && e.code && e.code === 1) {
                errorMessage = "File or directory not found."
              } else {
                errorMessage = e
              }
              that.errorMessage += `<p>${_TRANSLATE('Error exporting file: ')} ${fileName} ${_TRANSLATE(' at backup location: ')} ${backupLocation}  ${_TRANSLATE(' Error: ')} ${errorMessage}</p>`
            })

            // splitPromises.push(new Promise(function (resolve) {
            //   outstream.on('finish', resolve);
            // }));
            out = [];
            numDocsInBatch = 0;
            numFiles++;
          }

          const stream = new window['Memorystream']
          stream.on('data', async (chunk) => {
            // data += chunk.toString();
            var line = JSON.parse(chunk);
            if (first) {
              header = chunk;
              // console.log();
              let doc_del_count = line.db_info.doc_del_count ? line.db_info.doc_del_count : 0
              var totalDocs = line.db_info.doc_count + doc_del_count;
              this.statusMessage += `<p>${_TRANSLATE('Backing up ')} ${totalDocs} ${_TRANSLATE(' docs for ')} ${dbName}</p>`

            } else if (line.seq) {
              // bar.tick(1);
              // console.log("line")
            }

            if (line.docs) {
              numDocsInBatch += line.docs.length;
              if (numDocsInBatch >= this.SPLIT) {
                await dumpToSplitFile(this);
              }
            }
            if (!first) {
              out.push(chunk);
            }
            first = false;
            // next();
          });

          async function processData() {
            if (out.length) {
              await dumpToSplitFile(this);
            }
            return Promise.all(splitPromises).then(() => {
              console.log(); // clear the progress bar
            });
          }
          await db.dump(stream, dumpOpts).then(processData.bind(this));
          this.progressMessage = ""
          this.statusMessage += `<p>${_TRANSLATE('Backup completed at')} ${backupLocation}${dbName}</p>`
          
        } else {
          
          const stream = new window['Memorystream']
          let data = '';
          stream.on('data', function (chunk) {
            data += chunk.toString();
          });
          await db.dump(stream)
          console.log('Successfully exported : ' + dbName);
          this.statusMessage += `<p>${_TRANSLATE('Successfully exported database ')} ${dbName}</p>`
          const file = new Blob([data], {type: 'application/json'});
          this.downloadData(file, fileName, 'application/json');
        }
      }
    }
  }

  onErrorGetDir(e) {
    console.log("Error: " + e)
    let errorMessage
    if (e && e.code && e.code === 1) {
      errorMessage = "File or directory not found."
    } else {
      errorMessage = e
    }
    this.errorMessage += `<p>${_TRANSLATE('Error creating directory. Error: ')} ${errorMessage}</p>`
  }

  downloadData(content, fileName, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = fileName;
    a.click();
  }

}



 



