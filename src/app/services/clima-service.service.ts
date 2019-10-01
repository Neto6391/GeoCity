import { Injectable } from "@angular/core";
import {
	HttpClient,
	HttpHeaders,
	HttpParams,
	HttpErrorResponse
} from "@angular/common/http";
import PouchDB from "pouchdb";
import cordovaSqlitePlugin from "pouchdb-adapter-cordova-sqlite";

@Injectable({
	providedIn: "root"
})
export class ClimaServiceService {
	apiURL: String = "https://apiadvisor.climatempo.com.br";
	apiKey: String = "62d42b1548523de65efa393128fe4cc8";
	clima: any;
	dataIndexColumnCached = { indexColumn: 0, indexData: 0 };
	cities: any;
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
		let indexOldRegistry: any = { id: "", rev: "", data: [] };

		// let dataOldRegistry: any = this.cities[index.cityIndexedColumn];
		const allDocs = await this.db.allDocs({ include_docs: true });

		await allDocs.rows.map((row, i) => {
			if (i === index.cityIndexedColumn) {
				indexOldRegistry.id = row.doc._id;
				indexOldRegistry.rev = row.doc._rev;
				indexOldRegistry.data = row.doc.data;
			}
		});

		this.db.put({
			_id: indexOldRegistry.id,
			_rev: indexOldRegistry.rev,
			data: indexOldRegistry.data,
			dataWeather: weather
		});

		return await this.getDataCache();
	}

	public async findWeatherNow(index: any) {
		console.log("Find ", index.indexCityRegistred);
		const dataWeather = await this.getDataWeather(
			index.indexCityRegistred.locales[0]
		);
		const weatherData = await this.setWeatherInCacheData(index, dataWeather);
		return weatherData;
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
		let cached: boolean = false;
		const allDocs = await this.db.allDocs({ include_docs: true });
		const test = await this.getDataCache();
		console.log(test);
		if (allDocs.total_rows !== 0) {
			allDocs.rows.map((row: any) => {
				if (row.doc.data[0].state === state) {
					cached = true;
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

		if (dataCities === 0) {
			this.cities = 0;
		} else {
			this.cities = undefined;
			dataCities = { data: dataCities };
			this.db.post(dataCities);
		}
	}

	private async getCitiesFromState(stateName: string) {
		if (await this.isCachedCities(stateName)) {
			console.log("Cached! XXX");
			const dataCities = this.getDataCache();
			this.cities = dataCities;
			return this.cities;
		} else {
			console.log("Else");
			await this.searchCities(stateName);

			if (this.cities === 0) {
				return this.cities;
			} else {
				this.cities = this.getDataCache();
				return this.cities;
			}
		}
	}

	public async getIDCityAfterRegistred(cityName: string, stateName: string) {
		const cities = await this.getCitiesFromState(stateName);

		if (cities !== 0) {
			await cities.map(async (city, columnDataIndex) => {
				await this.linearSearch(city.data, cityName, columnDataIndex);
			});

			const indexCity = this.dataIndexColumnCached;

			if (
				!(
					(await cities[indexCity.indexColumn].dataWeather) &&
					(await cities[indexCity.indexColumn].dataWeather.name) !==
						cities[indexCity.indexColumn].data.name
				)
			) {
				const indexRegistred = await this.registerCityById(
					cities[indexCity.indexColumn].data[indexCity.indexData].id
				);

				const dataPayload = {
					cityIndexedColumn: indexCity.indexColumn,
					cityIndexedData: indexCity.indexData,
					indexCityRegistred: indexRegistred
				};
				return dataPayload;
			} else {
				return {
					payload: indexCity,
					cachedCities: cities[indexCity.indexColumn]
				};
			}
		} else {
			return 0;
		}
	}

	private async linearSearch(
		arr: any,
		value: string,
		columnCachedData: number
	) {
		arr.map((el, i) => {
			if (el.name === value) {
				this.dataIndexColumnCached.indexColumn = columnCachedData;
				this.indexLinearSearch = i;
			}
		});
		this.dataIndexColumnCached.indexData = this.indexLinearSearch;
	}
}
