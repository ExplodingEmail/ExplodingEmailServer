<br>
<div style="text-align: center">
<img src="https://github.com/ExplodingEmail/ExplodingEmailServer/actions/workflows/codeql.yml/badge.svg">
<img src="https://github.com/ExplodingEmail/ExplodingEmailServer/actions/workflows/dependency-review.yml/badge.svg">
<img src="https://github.com/ExplodingEmail/ExplodingEmailServer/actions/workflows/eslint.yml/badge.svg">
<img src="https://img.shields.io/discord/899020130091139082?color=5865F2&label=Discord&logo=discord&style=plastic">
</div>

# ExplodingEmail Server
<hr>

Generate temporary email addresses using this service!

[View it here!](https://exploding.email)
## How does it work?

You can read the API docs [here](https://exploding.email/api.html).

### building and running locally

```
apt install redis-cli #should install redis too if you don't already have it
# make sure yarn is installed (npm i -g yarn)
yarn && yarn start
```

You may need to change some values in the client so that it doesn't target the production servers.

For Redis, you must manually set the value of `exp-stats` to `0` in the cli, else it will not persist across restarts.
