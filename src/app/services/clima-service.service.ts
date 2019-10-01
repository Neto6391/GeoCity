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
import { Observable } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class ClimaServiceService {
	apiURL: String = "https://apiadvisor.climatempo.com.br";
	apiKey: String = "8c912e8476b5834a1c4b73fc0c9ef245";
	clima: any;
	Clima: any;
	cities: any;
	error: any;
	indexLinearSearch: any;
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

	private findIndex(
		array: { [x: string]: { _id: number }; length: any },
		id: number
	) {
		let low = 0,
			high = array.length,
			mid: number;
		while (low < high) {
			mid = (low + high) >>> 1;
			array[mid]._id < id ? (low = mid + 1) : (high = mid);
		}
		return low;
	}

	private async getDataWeather(id: number) {
		let weatherNow = await this.http
			.get<any>(
				`${this.apiURL}/api/v1/weather/locale/${id}/current?token=${this.apiKey}`
			)
			.toPromise()
			.then(res => {
				return res;
			})
			.catch((err: HttpErrorResponse) => {
				return err;
			});
		weatherNow = { weather: weatherNow };

		return weatherNow;
	}

	private async getDataCache() {
		const allDocs = await this.db.allDocs({ include_docs: true });
		return allDocs.rows.map(row => {
			return row.doc;
		});
	}

	//weatherData: any
	private async setWeatherInCacheData(index: any, weather: any) {
		let indexOldRegistry: any;
		let dataOldRegistry: any;
		console.log(weather);
		const allDocs = await this.db.allDocs({ include_docs: true });
		console.log(allDocs);
		if (allDocs.rows[index.cityIndexedColumn].doc.data[index.cityIndexedData]) {
			indexOldRegistry = {
				id: allDocs.rows[index.cityIndexedColumn].doc._id,
				rev: allDocs.rows[index.cityIndexedColumn].doc._rev
			};
		}
		allDocs.rows.map(row => {
			dataOldRegistry = row.doc.data;
		});

		console.log(indexOldRegistry);
		this.db.put({
			_id: indexOldRegistry.id,
			_rev: indexOldRegistry.rev,
			data: dataOldRegistry,
			dataWeather: weather
		});
		const weatherCached = await this.getDataCache();
		console.log(weatherCached);
		//return weather;
	}

	public async findWeatherNow(index: any) {
		const dataWeather = await this.getDataWeather(
			index.indexCityRegistred.locales[0]
		);
		const test = await this.setWeatherInCacheData(index, dataWeather);
		console.log("findWeather ", test);
	}

	private async registerCityById(id: number) {
		console.log(id);
		let data = {
			"localeId[]": id.toString()
		};
		const body = new HttpParams({ fromObject: data });

		return await this.http
			.put(`${this.apiURL}/api-manager/user-token/${this.apiKey}/locales`, body)
			.toPromise()
			.then(success => {
				return success;
			})
			.catch(err => {
				return err;
			});
	}

	private async isCachedCities(state: string) {
		let cached: boolean;
		const allDocs = await this.db.allDocs({ include_docs: true });

		if (allDocs.total_rows !== 0) {
			allDocs.rows.map((row: any) => {
				if (row.doc.data[0].state === state) {
					cached = true;
				} else {
					cached = false;
				}
			});
		} else {
			cached = false;
		}

		return cached;
	}

	private async searchCities(state: string) {
		let dataCities = await this.http
			.get<any>(
				`${this.apiURL}/api/v1/locale/city?&state=` +
					state +
					`&token=${this.apiKey}`
			)
			.toPromise()
			.then(res => {
				if (res.length === 0) {
					return 0;
				} else {
					return res;
				}
			})
			.catch((err: HttpErrorResponse) => {
				return err;
			});
		console.log("searchCities ", dataCities);
		dataCities = { data: dataCities };
		this.db.post(dataCities);
		// return dataCities;
	}

	private async getAllCities() {
		const allDocs = await this.db.allDocs({ include_docs: true });
		let cities = allDocs.rows.map(row => {
			return row.doc;
		});
		return cities;
	}

	private async getCitiesFromState(stateName: string) {
		if (await this.isCachedCities(stateName)) {
			const dataCities = this.getAllCities();
			this.cities = dataCities;
			return this.cities;
		} else {
			console.log("Else");
			await this.searchCities(stateName);
			this.cities = this.getAllCities();
			return this.cities;
		}
	}

	public async getIDCityAfterRegistred(cityName: string, stateName: string) {
		const cities = await this.getCitiesFromState(stateName);
		console.log(cities);

		console.log("NameCity ", cityName);
		let dataIndexAux = { indexColumn: 0, indexData: 0 };
		// let indexCity;

		await cities.map(async (city, i) => {
			let dataCityAux = await this.linearSearch(city.data, cityName);
			dataIndexAux.indexColumn = i;
			dataIndexAux.indexData = dataCityAux;
		});

		const indexCity = await {
			indexColumn: dataIndexAux.indexColumn,
			indexColumnData: dataIndexAux.indexData
		};
		console.log(
			"Dado -> ",
			cities[indexCity.indexColumn].data[indexCity.indexColumnData].id
		);

		const indexRegistred = await this.registerCityById(
			cities[indexCity.indexColumn].data[indexCity.indexColumnData].id
		);

		const dataPayload = {
			cityIndexedColumn: indexCity.indexColumn + 1,
			cityIndexedData: indexCity.indexColumnData,
			indexCityRegistred: indexRegistred
		};
		return dataPayload;
	}

	private async linearSearch(arr, value) {
		let index;
		// console.log("linearSearch ", arr);
		arr.map((el, i) => {
			//console.log("linearSearch El -> ", el, " Value -> ", value);
			if (el.name === value) {
				console.log("Entrou!", i);
				console.log(el.name);
				this.indexLinearSearch = i;
			} else {
				console.log("falhou!");
			}
		});

		return this.indexLinearSearch;
	}
}
