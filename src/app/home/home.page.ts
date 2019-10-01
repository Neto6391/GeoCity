import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { AlertController } from "@ionic/angular";

import { Map, Control, tileLayer, Marker, icon } from "leaflet";
import { ClimaServiceService } from "../services/clima-service.service";
import { DataService } from "../services/data.service";

import "leaflet-control-geocoder";

const iconRetinaUrl = "assets/icon/marker-icon-2x.png";
const iconUrl = "assets/icon/marker-icon.png";
const shadowUrl = "assets/icon/marker-shadow.png";

//Fix for Bug Icon when clicked in Map
const iconDefault = icon({
	iconRetinaUrl,
	iconUrl,
	shadowUrl,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	tooltipAnchor: [16, -28],
	shadowSize: [41, 41]
});

Marker.prototype.options.icon = iconDefault;

@Component({
	selector: "app-home",
	templateUrl: "home.page.html",
	styleUrls: ["home.page.scss"]
})
export class HomePage {
	map: Map;
	search_address: string;
	geocoder: any;
	onMarked: any;
	nameCity: string;
	nameState: string;

	constructor(
		private climaTempo: ClimaServiceService,
		private dataService: DataService,
		private router: Router,
		public alertController: AlertController
	) {
		//this.getCityNameById();
	}

	ionViewDidEnter() {
		this.leafletMap();
	}

	leafletMap() {
		//Start Map
		this.map = new Map("map").setView([0, 0], 4);
		let map = this.map;

		//Define Geocode option for Google, this option require API_KEY
		this.geocoder = Control.Geocoder.google(
			"AIzaSyDs7nC7WEfLbE75yxhjrNSzJ2ldr7Td768"
		);

		let control = Control.geocoder({
			geocoder: this.geocoder
		}).addTo(this.map);

		//Add Event Handler for click and Mark in Map
		this.map.on("click", (e: Map) => {
			this.geocoder.reverse(
				e.latlng,
				map.options.crs.scale(map.getZoom()),
				(results: any) => {
					//Results from plugin control-geocoder
					let r = results[0];

					//Remove elements of city, to get element with id
					let zeroElementsCity = r.properties.map(e => {
						return e.types.filter(e => {
							return e === "administrative_area_level_2";
						});
					});

					//Use element id, for search City name
					zeroElementsCity.map((e, i) => {
						if (e.length > 0) {
							this.nameCity = r.properties[i].long_name;
						}
					});

					//Remove elements of state, to get element with id
					let zeroElementsState = r.properties.map(e => {
						return e.types.filter(e => {
							return e === "administrative_area_level_1";
						});
					});

					//Use element id, for search State name
					zeroElementsState.map((e, i) => {
						if (e.length > 0) {
							this.nameState = r.properties[i].short_name;
						}
					});

					this.searchClima();
				}
			);
		});

		tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.map);
	}

	async searchClima() {
		//Call Service for get payload of indexes, from DBCache
		const indexes = await this.climaTempo.getIDCityAfterRegistred(
			this.nameCity,
			this.nameState
		);
		if (indexes !== 0) {
			const payload = await indexes.payload;
			let dataWeather: any;

			if (payload) {
				dataWeather = indexes.cachedCities.dataWeather;
				console.log(dataWeather);
				this.dataService.setData("data", dataWeather);
				this.router.navigateByUrl("/weather/data");
			} else {
				dataWeather = await this.climaTempo.findWeatherNow(indexes);
				const index = indexes.cityIndexedColumn;
				console.log(dataWeather[index].dataWeather);
				this.dataService.setData("data", dataWeather[index].dataWeather);
				this.router.navigateByUrl("/weather/data");
			}
		} else {
			this.presentAlert(
				"Erro",
				"Somente o País do Brasil pode ser Consultado!"
			);
		}
	}

	//This Method is for search StringField and Mark in Map
	searchAddress(data: any) {
		this.search_address = data.form.value.search_address.trim();

		if (this.search_address) {
			this.geocoder.geocode(this.search_address, (results: any) => {
				let r = results[0];

				//Verify results diferent of undefined
				if (typeof r !== "undefined") {
					//Remove elements of city, to get element with id
					let zeroElementsCity = r.properties.map(e => {
						return e.types.filter(e => {
							return e === "administrative_area_level_2";
						});
					});

					zeroElementsCity.map((e, i) => {
						if (e.length > 0) {
							this.nameCity = r.properties[i].long_name;
						}
					});

					//Remove elements of state, to get element with id
					let zeroElementsState = r.properties.map(e => {
						return e.types.filter(e => {
							return e === "administrative_area_level_1";
						});
					});

					zeroElementsState.map((e, i) => {
						if (e.length > 0) {
							this.nameState = r.properties[i].short_name;
						}
					});
				}

				this.searchClima();
			});
		} else {
			this.presentAlert(
				"Erro!",
				"Não pode pesquisar cidade com espaço em branco!"
			);
		}
	}

	async presentAlert(title: string, message: string) {
		const alert = await this.alertController.create({
			header: title,
			message: message,
			buttons: ["OK"]
		});

		await alert.present();
	}

	ionViewWillLeave() {
		this.map.remove();
	}
}
