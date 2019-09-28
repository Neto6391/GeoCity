import { Injectable } from "@angular/core";
import {
	HttpClient,
	HttpHeaders,
	HttpParams,
	HttpErrorResponse
} from "@angular/common/http";
import { map } from "rxjs/operators";

@Injectable({
	providedIn: "root"
})
export class ClimaServiceService {
	apiURL: String = "https://apiadvisor.climatempo.com.br";
	apiKey: String = "8c912e8476b5834a1c4b73fc0c9ef245";
	clima: any;
	options: any = {
		headers: new HttpHeaders().set("Access-Control-Allow-Origin", "*")
	};

	constructor(private http: HttpClient) {}

	getAllIdRegistries() {
		return this.http
			.get<any>(
				`${this.apiURL}/api-manager/user-token/${this.apiKey}/locales`,
				this.options
			)
			.pipe(
				map(model => {
					this.clima = model.locales;
					return this.clima;
				})
			);
	}

	searchWeatherNow(id: number) {
		return new Promise((resolve, reject) => {
			this.http
				.get<any>(
					`${this.apiURL}/api/v1/weather/locale/${id}/current?token=${this.apiKey}`
				)
				.subscribe(
					res => {
						console.log(res);
						resolve(res);
					},
					(err: HttpErrorResponse) => {
						reject(err);
					}
				);
		});
	}

	registerCityById(id: string) {
		let params = new HttpParams();
		params = params.append("localeId", id);
		const body = { params: params };
		this.http.put(`${this.apiURL}/api-manager/user-token/${this.apiKey}`, body);
	}

	getIdCity(cityName: string, stateName: string) {
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
							resolve(res[0].id);
						}
					},
					(err: HttpErrorResponse) => {
						reject(err);
					}
				);
		});
	}
}
