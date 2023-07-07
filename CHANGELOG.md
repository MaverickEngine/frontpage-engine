# FrontpageEngine Changelog

## 0.2.7

* Fix array warning

## 0.2.4

* Show position on frontpage table
* Primary section
* URL
* Post ID
* Links to RSS and JSON feeds

## 0.2.3

* JSON feed
* RSS feed

## 0.1.2

* Fix to ensure that unpublished articles are not published to the frontpage.

## 0.1.1

* When a post is unpublished, remove it from the frontpage and set all of its flags and taxonomy correctly.
* Refactor function names to snake_case, and make sure no public functions are prefixed with `_`. 
* Add `endpoint_` prefix to all endpoint functions.
* If there was an error while performing a task, eg. locking a slot, it would fail silently and the state would be locked in an unready state. Now it will throw an exception and the state will be reset to ready.
* Start a Changelog.