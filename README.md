# Alisko

Alisko is a playwright-based web testing framework designed to simplify automated testing of websites the way a user would test them.

# Description

1. Alisko is a complete environment in which you can write test suites, debug and run them. Everything is in one box, easy to install and work.
2. As an environment for running tests, Alisko uses cross-platform playwright on standard browsers. If someday you want to leave Alisko or use these tests in some of your automated shells, you will not need to rewrite the code.
3. Using Alisko, it’s easy to write tests. Just open the Alisko browser and perform all the actions using your site - and Alisko will record all the actions for you in the form of a test, which you can then run. In the case of complex sites, this does not always work, but it greatly speeds up the work, simplifying a significant part of routine daily actions. The test can be run step by step or executed any line at any time - and you can immediately see what is happening in the browser.
4. Websites are constantly changing and developing, and we want to know that all parts of it are still working. Run a test suite on Alisko and it will pause where changes prevent you from going any further - for example, where the text on a button has changed. Open the Alisko browser and simply perform the desired action - for example, click a button. Alisko will write the modified test code, and you can immediately continue running the entire test suite - without restarting. Alisko will do all the routine for you, and you will only approve what has been changed!
5. We are trying to record walking around the site and writing tests the way a person sees them - without getting attached to the "technical details". For example, Alisko will write in the test “click the button that says...” and not “click the 8th element of the 5th div of the 3rd table”. She can fill out forms and attach files, she can open new tabs or work on behalf of two different sessions simultaneously "this is the client, and this is the administrator."
6. Alisko can write "click the OK button, which is located to the right of the test John." But what to do if there are no inscriptions, and the search button only has a “magnifying glass” icon? Alisko can recognize icons and click on the icon that matches the meaning! Yes, not all meanings are recognized yet, but we are working on it.
7. Websites can be large and complex. Alisko can pass information between tests and run tests in parallel, or follow a dependency tree (first it will run a test to create a user, then run three tests in parallel under the name of this user). She even knows how to pause if one of the tests “fell”, and then continue executing the entire tree!
8. Alisko is open source - use it and let's make our websites work reliably.


# Installation from distribution

1. Go to the [Releases page](https://github.com/vlesu/alisko/releases)
2. Download the Alisko distribution corresponding to your operating system
3. Run it, it will be installed for the current user.
4. Use it! Internet is not required for Alisko to work.

We have verified that Alisko works on
- Window 10
- Ubuntu
- Mac OS @ m1

# Basic Usage

Video lesson: https://youtu.be/qKV0yORRBT0

1. Open Alisko
2. Select the location on the disk where your tests will be stored
3. Create a new test
4. Open Alisko browser ("video" icon in right panel)
5. In Alisko Browser, open the site, for example, https://alisko.vlesu.com/playground/
6. In the Alisko browser, click on links and buttons
7. Go to the main Alisko window - oh, the test is already written!
8. Terminate the browser session by clicking the cross on the test execution panel, and run the entire test by clicking the play button - it will start and run!
9. On the left side of the window, completed and successfully completed tests will be shown in green

Additional information can be found in [documentation](docs/docs.md) 

# Development

If some frequently used modern user interaction technology is not covered by the Alisko browser analyzer and it is not able to record some tests "based on user actions", let us know - we need to understand where to develop Alisko and what people need.

If you really need some functions specific to your project, let us know - we can build them in at your request.

If you want to completely outsource the automated testing of your project to our team for support, write to us!

# Build from source

Alisko's source code is fully published under a license that allows its use in your commercial projects.

If you want to build a distribution from source code, the approximate build order for different systems is given in the [build instructions](docs/build.md) 