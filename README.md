Build on Node.js, Express and MongoDB (Mongoose)
Minimum Node.js version required 14.x

***Some APIs are available for user oriented data as well as all data (allCategoriesListWithQuestions, allCategoriesListOnly), can be accessed by providing "user=true" in the query parameter.

***Logged in user can only modify and assign category to the questions created by the user.

***Questions and categories are unique for each user.

***sample.csv file is provided for the 6th point of the assignment.

1. Run npm i for installing the dependencies.
2. Start the MongoDB server on your system (if DB server set up locally).
2. Run "npm run dev" and "npm run start" for running the project on development and production mode respectively.