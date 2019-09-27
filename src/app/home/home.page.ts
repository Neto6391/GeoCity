import { Component } from "@angular/core";
import {
	Validators,
	FormBuilder,
	FormGroup,
	FormControl
} from "@angular/forms";

import { Map, Control, tileLayer, Marker, icon } from "leaflet";
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
	search_address: String;
	geocoder: any;
	onMarked: any;

	ionViewDidEnter() {
		this.leafletMap();
	}

	leafletMap() {
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
			if (this.onMarked) {
				this.map.removeLayer(this.onMarked);
				this.onMarked = undefined;
			}
			console.log(e.target.options.crs);
			this.geocoder.reverse(
				e.latlng,
				map.options.crs.scale(map.getZoom()),
				(results: any) => {
					let r = results[0];
					console.log(r);
					if (r) {
						if (this.onMarked) {
							this.onMarked
								.setLatLng(r.center)
								.setPopupContent(r.html || r.name)
								.openPopup();
						} else {
							this.onMarked = new Marker(r.center)
								.bindPopup(r.name)
								.addTo(map)
								.openPopup();
						}
					}
				}
			);
		});

		tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.map);
	}

	//This Method is for search StringField and Mark in Map
	searchAddress(data: any) {
		this.search_address = data.form.value.search_address;

		if (this.onMarked) {
			this.map.removeLayer(this.onMarked);
			this.onMarked = undefined;
		}

		this.geocoder.geocode(this.search_address, (results: any) => {
			let r = results[0];
			if (r) {
				if (this.onMarked) {
					this.onMarked
						.setLatLng(r.center)
						.setPopupContent(r.html || r.name)
						.openPopup();
				} else {
					this.onMarked = new Marker(r.center)
						.bindPopup(r.name)
						.addTo(this.map)
						.openPopup();
				}
			}
		});
	}

	ionViewWillLeave() {
		this.map.remove();
	}
}
