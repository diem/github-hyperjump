import { Application, Context } from "probot";
import * as express from "express";

export = (app: Application) => {
  const router = app.route("/hyperjump");
  router.use(express.json())
  router.post("/jump", async (req, res) => {
    console.log(req.body);

    if (!req.body["owner"] || !req.body["repo"] || !req.body["type"] || !req.body["args"]) {
      res.sendStatus(400);
    } else {
      // Use app level scope to find our installation id
      let app_client = await app.auth();
      let { data: { id } } = await app_client.apps.getRepoInstallation({
        owner: req.body["owner"],
        repo: req.body["repo"],
      });

      // Use installation scope to fire the repository_dispatch
      let client = await app.auth(id);
      await client.repos.createDispatchEvent({
        owner: req.body["owner"],
        repo: req.body["repo"],
        event_type: req.body["type"],
        client_payload: req.body["args"],
      });
    
      res.sendStatus(204);
    }
  });
}
