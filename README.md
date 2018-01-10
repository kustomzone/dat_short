dat_short
*********

A URL shortener for DAT/Beaker.

This web application is a proof of concept (nothing more) for a
URL shortener for DAT/Beaker.

Users supply a dat URL and optionally a alternative HTTPS one (HTTP is
not supported). If the browser contacting is beaker then it gets the
dat one. If not it gets the HTTPS one or, if that a HTTPS URL was not
supplied, an informational message

I did this because dat URLs on places like Twitter or Patchwork do
are not clickable. Also it allows for seamless transition between dat
and https.

You can find this at http://s.tiago.org, but beware that this is
just a proof of concept.

Requirements
=============

sqlite3

Configuration
==============

- Template configuration

- Web server integration

- Standalone (HTTPS...)

How to run
===========


`npm start`

Interested
==========

[Contact me](mailto:tiago@tiago.org)

License and copyright
=======================

License: Affero GPL v3.

Copyright 2018 Tiago Rodrigues Antão
