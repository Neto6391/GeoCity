import { Injectable } from "@angular/core";
import {
	HttpClient,
	HttpHeaders,
	HttpParams,
	HttpErrorResponse
} from "@angular/common/http";
import PouchDB from "pouchdb";
import cordovaSqlitePlugin from "pouchdb-adapter-cordova-sqlite";

import { map } from "rxjs/operators";

@Injectable({
	providedIn: "root"
})
export class ClimaServiceService {
	apiURL: String = "https://apiadvisor.climatempo.com.br";
	apiKey: String = "8c912e8476b5834a1c4b73fc0c9ef245";
	clima: any;
	Clima: any;
	error: any;
	options: any = {
		headers: new HttpHeaders().set("Access-Control-Allow-Origin", "*")
	};

	db: any;

	constructor(private http: HttpClient) {
		this.initDB();
	}

	initDB() {
		PouchDB.plugin(cordovaSqlitePlugin);
		this.db = new PouchDB("clima.db", { adapter: "cordova-sqlite" });
		this.db.info().then(console.log.bind(console));
	}

	public async getAllIdRegistries() {
		//Check if not exists cache in clima
		if (!this.clima) {
			return this.db.allDocs({ include_docs: true }).then(async docs => {
				console.log("getAllIdRegistries Begin ", docs.rows);
				if (docs.rows.length > 0) {
					console.log(
						"getAllIdRegistries Length is greather than 0",
						docs.rows
					);
					this.clima = docs.rows.map(row => {
						return row.doc;
					});

					this.db
						.changes({ live: true, since: "now", include_docs: true })
						.on("change", this.onDatabaseChange);

					return this.clima;
				} else {
					console.log("Start getAllIdRegistries() -> 0", docs.rows.length);

					const registries = await this.http
						.get<any>(
							`${this.apiURL}/api-manager/user-token/${this.apiKey}/locales`
						)
						.toPromise()
						.catch(res => {
							return res;
						})
						.catch(err => {
							return err;
						});

					this.clima = registries;
					this.db.post(this.clima);

					return registries;
				}
			});
		} else {
			console.log("End getAllIdRegistries() ", this.clima);
			console.log(this.clima);
			let data: any = this.clima;
			this.clima = undefined;

			return new Promise(resolve => resolve(data));
		}
	}

	private onDatabaseChange = (change: { id: any; deleted: any; doc: any }) => {
		const index = this.findIndex(this.clima, change.id);
		const clima = this.clima[index];

		if (change.deleted) {
			if (clima) {
				this.clima.splice(index, 1); // delete
			}
		} else {
			// console.log(change.doc.date);
			//change.doc.date = new Date(change.doc.date);
			if (clima && clima._id === change.id) {
				this.clima[index] = change.doc; // update
			} else {
				this.clima.splice(index, 0, change.doc); // insert
			}
		}
	};

	private findIndex(array, id) {
		let low = 0,
			high = array.length,
			mid;
		while (low < high) {
			mid = (low + high) >>> 1;
			array[mid]._id < id ? (low = mid + 1) : (high = mid);
		}
		return low;
	}

	public searchWeatherNow(id: number) {
		if (!this.Clima) {
			//Original Function
			// return new Promise((resolve, reject) => {
			// 	this.http
			// 		.get<any>(
			// 			`${this.apiURL}/api/v1/weather/locale/${id}/current?token=${this.apiKey}`
			// 		)
			// 		.subscribe(
			// 			res => {
			// 				this.db.post(res);
			// 				resolve(res);
			// 				//return this.searchWeatherNow(id);
			// 			},
			// 			(err: HttpErrorResponse) => {
			// 				reject(err);
			// 			}
			// 		);
			// });
			return this.db.allDocs({ include_docs: true }).then(async docs => {
				return new Promise((resolve, reject) => {
					let data: any = null;

					if (!this.error) {
						let interval = setInterval(() => {
							console.log("Else Weather()");
							clearInterval(interval);
							this.http
								.get<any>(
									`${this.apiURL}/api/v1/weather/locale/${id}/current?token=${this.apiKey}`
								)
								.subscribe(
									res => {
										this.Clima = res;

										if (docs.rows.length <= 1) {
											this.db.post(this.Clima);

											clearInterval(interval);
											this.searchWeatherNow(id);
										} else {
											let dataAux: any;
											dataAux = docs.rows.map(el => {
												return el.doc;
											});

											//Update dataAux for DB Cash
											this.db.bulkDocs(dataAux);

											data = this.Clima;
											console.log(data);

											this.Clima = null;
											clearInterval(interval);

											resolve(data);
										}
									},
									(err: HttpErrorResponse) => {
										this.Clima = err;
										console.log(this.Clima);
										clearInterval(interval);
										return this.searchWeatherNow(id);
									}
								);
						}, 6000);
					} else {
						console.log(
							"Errorrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr"
						);
					}
				});
			});
		} else {
			// console.log(this.Clima);
			console.log("182 ", this.clima);

			return new Promise((resolve, reject) => {
				let data: any = null;
				console.log("Else ", this.Clima);
				if (this.Clima.status === "400") {
					data = this.Clima;
					this.Clima = null;
					return this.searchWeatherNow(id);
					// reject(data);
				} else {
					data = this.Clima;
					console.log(data);
					this.Clima = null;

					// return data;
					//window.location.reload();
					resolve(data);
				}
			});
		}

		// return new Promise((resolve, reject) => {
		// 	this.http
		// 		.get<any>(
		// 			`${this.apiURL}/api/v1/weather/locale/${id}/current?token=${this.apiKey}`
		// 		)
		// 		.subscribe(
		// 			res => {
		// 				resolve(res);
		// 			},
		// 			(err: HttpErrorResponse) => {
		// 				reject(err);
		// 			}
		// 		);
		// });
	}

	public registerCityById(id: number) {
		let data = {
			"localeId[]": id.toString()
		};
		const body = new HttpParams({ fromObject: data });

		this.http
			.put(`${this.apiURL}/api-manager/user-token/${this.apiKey}/locales`, body)
			.subscribe(
				res => {
					let success: any = res;

					if (success.status === "success") {
						console.log(success);
						return this.db.allDocs({ include_docs: true }).then(docs => {
							docs.rows.map(async el => {
								el.doc.date = new Date(el.doc.date);
								await this.db.put({
									_id: el.doc._id,
									_rev: el.doc._rev,
									locales: success.locales[0]
								});
							});
						});
					} else {
						console.log("Error not success");
						this.error = [];
						this.registerCityById(id);
					}
				},
				err => {
					this.error = err;
					this.registerCityById(id);
				}
			);
	}

	public getCityNameById(id: number) {
		return new Promise((resolve, reject) => {
			this.http
				.get<any>(
					`${this.apiURL}/api/v1/locale/city/${id}?token=${this.apiKey}`
				)
				.subscribe(
					res => {
						resolve(res);
					},
					(err: HttpErrorResponse) => {
						reject(err);
					}
				);
		});
	}

	public getIdFromCityState(cityName: string, stateName: string) {
		return new Promise((resolve, reject) => {
			this.http
				.get<any>(
					`${this.apiURL}/api/v1/locale/city?name=` +
						cityName +
						`&state=` +
						stateName +
						`&token=${this.apiKey}`
				)
				.subscribe(
					res => {
						if (res.length === 0) {
							resolve(0);
						} else {
							console.log("getIdFromCityState ", res[0].id);
							resolve(res[0].id);
						}
					},
					(err: HttpErrorResponse) => {
						console.log("getIdFromCityState Error ", err);
						reject(err);
					}
				);
		});
	}
}
