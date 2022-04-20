
# ExplodingEmail Server

## A website which generates temporary email addresses!

Server for [exploding.email](https://exploding.email).

You can read the API docs [here](https://exploding.email/api.html).

### building and running locally

```
apt install redis-cli #should install redis too if you don't already have it
# make sure yarn is installed (npm i -g yarn)
yarn && yarn start
```

You may need to change some values in the client so that it doesn't target the production servers.

For Redis, you must manually set the value of `exp-stats` to `0` in the cli, else it will not persist across restarts.
