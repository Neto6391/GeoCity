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

	searchClima() {
		//Call Service for get ID, from City name and State
		this.climaTempo
			.getIdFromCityState(this.nameCity, this.nameState)
			.then((cityStateId: number) => {
				if (cityStateId !== 0) {
					//Check if ID is registred
					this.verifyIdIsRegistred(cityStateId);

					this.climaTempo
						.searchWeatherNow(cityStateId)
						.then(async res => {
							if (res) {
								if (!res.status) {
									let dataWeather: any = await res;
									console.log(dataWeather);
									this.dataService.setData("data", dataWeather);
									this.router.navigateByUrl("/weather/data");
								} else {
									//window.location.reload();
								}
							}
						})
						.catch(err => {
							this.presentAlert("Erro", "Tente consultar novamente!");
						});
				} else {
					this.presentAlert(
						"Erro",
						"Somente o País do Brasil pode ser Consultado!"
					);
				}
			})
			.catch(err => console.log(err));
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

	async verifyIdIsRegistred(id: number) {
		let isRegistred: Boolean;
		console.log("verifyIdIsRegistred begin ", id);

		try {
			//Get Array of registries all IDs
			const registries = await this.climaTempo.getAllIdRegistries();
			console.log("verifyIdIsRegistred Registries ", registries);

			//Check if registries is set and have length <= 1
			if (typeof registries !== "undefined" && registries.length <= 1) {
				if (registries[0].hasOwnProperty("locales")) {
					isRegistred = registries[0].locales[0] !== id ? false : true;
					console.log("verifyIdIsRegistred isRegistredIf ", isRegistred);
				} else {
					isRegistred = registries[1].locales[0] !== id ? false : true;
					console.log("verifyIdIsRegistred isRegistredIf ", isRegistred);
				}

				console.log("verifyIdIsRegistred isRegistred ", isRegistred);

				if (!isRegistred) {
					return this.registerCity(id);
				}
			} else {
				console.log(id);
				// return this.verifyIdIsRegistred(id);
			}
		} catch (err) {
			// window.location.reload();
			console.log(err);
		}
	}

	registerCity(idCity: number) {
		this.climaTempo.registerCityById(idCity);
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
