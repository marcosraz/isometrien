import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { AppComponent } from "./app/app.component";

// We are now bootstrapping the main AppComponent directly, which is the
// standard for modern, standalone Angular applications.
bootstrapApplication(AppComponent, {
  // Application-level providers are configured here.
  providers: [
    // Sets up the router. We don't have any routes yet, so we pass an empty array.
    provideRouter([]),
  ],
}).catch((err) => console.error(err));
