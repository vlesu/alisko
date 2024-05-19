

# Uploading files and basic operations

Alisko can do the following operations:

1. Find the correct names for the links and buttons we click on, and record these clicks in the test code
2. Check for the presence of certain texts on the page “yes, we were answered correctly”
3. Send a series of keystrokes to the desired fields, i.e. fill out forms and even send “special keys” to the desired field or globally “to the browser window”
4. Upload files. It itself determines that the system offers to upload a file - if, for example, you clicked on the “input type=file” field - and prompts you to select the file that needs to be attached; after which he writes the required code into the test using the playwright syntax “we will load this file”
5. Identify standard browser messages and questions in pop-up windows and give them the answers you choose
6. Determine when a new window has opened, and at your direction, either go to this opened window and continue the test there, or continue the test in the old window. Of course you can switch between windows!
7. Open a separate browser session and switch between open sessions, sequentially performing parts of the test in the desired session. For example, you can cover with tests the scenario “the user asked the administrator, the administrator logged in, saw the user’s request and responded to him, the user saw the administrator’s response...”
8. Change the size of the browser window, as well as launch a real headless browser (that is, the browser is running, but it is not visible)

# Parallel running of tests and dependent execution

A running Alisko instance has a common environment through which tests can communicate. There are commands for this
- Write the value of a public variable with name... value...
- Read the value of a public variable named... . If a given variable is not yet available (i.e. the test where it should be assigned has not yet reached the required step) - execution of this test will be temporarily paused and automatically continued when this variable is assigned.

A global reset of all tests "reset all" clears the values of all public variables, allowing you to run the entire test suite from scratch.

The construction of such a set of tests looks something like this:
1. Test 1
 a. Create a user on the site with the name “random name”
 b. We assign the user_name variable the value of this name
 c. Let's do something else
2. Test 2
 a. Getting the value of the user_name variable
 b. Log in with the password of this user and perform test steps 2
3. Test 3
 a. Getting the value of the user_name variable
 b. Log in with the password of this user and perform test steps 3

In such a test, tests 1,2,3 will run in parallel, tests 2,3 will pause when trying to get the name variable, Test 1 will assign a value to the variable and continue its work, tests 2 and 3 will understand this and also come to life and continue working.

The number of simultaneously running tests is limited so as not to overload the workstation resources. I start new tests as the old ones are completed.

# Icon recognition

Playwright does not recognize icons, this is a function of the alisko wrapper. For this task we have a neural network under the hood.

If Alisko was unable to find a suitable text locator for the click, it tries to recognize the screenshot of the page and identify the icons it is familiar with (regardless of the color and style of the icon). If your click hits the icon, Alisko will write in the test code “here you will need to recognize the screenshot and click on the icon with a semantic meaning...”. It will even continue to work if the designer changes one magnifying glass icon to another!
