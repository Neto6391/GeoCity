import { NgModule } from "@angular/core";
import { DataResolverService } from "./resolver/data-resolver.service";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";

const routes: Routes = [
	{ path: "", redirectTo: "home", pathMatch: "full" },
	{
		path: "home",
		loadChildren: () => import("./home/home.module").then(m => m.HomePageModule)
	},
	{
		path: "weather/:id",
		resolve: {
			data: DataResolverService
		},
		loadChildren: "./weather/weather.module#WeatherPageModule"
	}
];

@NgModule({
	imports: [
		RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
	],
	exports: [RouterModule]
})
export class AppRoutingModule {}
