import express from 'express';
import multer from 'multer';
import { check, validationResult } from 'express-validator';
import User from '../models/users.js';
import jwt from 'jsonwebtoken';
import commonController from '../controllers/commonController.js';

const upload = multer({ dest: '' });

const router = express.Router();
const authRouter = express.Router();;

authRouter.use(async (req, res, next) => {

  let token;
  if (req.headers.cookie && req.headers.cookie.startsWith('jwt')) {
    token = req.headers.cookie.split('=')[1];
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
  } else {
      token = req.body.accessToken || req.query.accessToken || req.headers['x-access-token'];
  }

  if (token) {
      new Promise((resolve, reject) => {
        jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
            if (err){
                reject(err);
            }
            resolve(decoded);
        });
      }).then(async (decoded) => {
          const user = await User.findOne({_id: decoded._id}, {password: 0});
          if (!user) {
              return res.status(403).send({
                  status: 'fail',
                  errors: 'Invalid user or token'
              });
          }
          
          req.user = JSON.parse(JSON.stringify(user));
          
          next();
      }).catch((err) => {
        return res.status(401).send({
            status: 'fail',
            errors: err
        });
      })
  } else {
      return res.status(401).send({
          status: 'fail',
          errors: 'Missing authorization token'
      });
  }
});

//-----------------------------------------Unauthenticated-------------------------------------------------//

router.post('/users/login', 
  [check('username', 'Please enter valid username').isLength({ min: 4 }), 
  check('password', 'Please enter valid password').isLength({ min: 4 })],
  commonController.login
);

//------------------------------------------Authenticated--------------------------------------------------//
authRouter.get('/users/logout', commonController.logout);
authRouter.patch('/users/updateProfile', upload.any('profilePicture'), commonController.updateProfile);
authRouter.get('/users/viewProfile', commonController.viewProfile);

authRouter.post('/common/addCategoryOrQuestion',
  [check('type', 'Please enter valid type').isIn(['question', 'category']), 
  check('name', 'Please enter name').isLength({ min: 1 })],
  commonController.addCategoryOrQuestion);

authRouter.get('/common/allCategoriesListOnly', commonController.allCategoriesListOnly);
authRouter.get('/common/allCategoriesListWithQuestions', commonController.allCategoriesListWithQuestions);

authRouter.post('/common/assignCategoryToQuestion',
  [check('categoryId', 'Please enter categoryId').not().isEmpty(), 
  check('questionId', 'Please enter questionId').not().isEmpty()],
  commonController.assignCategoryToQuestion);

authRouter.get('/common/allQuestionForEachCategory', commonController.allQuestionForEachCategory);

authRouter.post('/common/importDataFromCsv', upload.any('bulkfile'), commonController.importDataFromCsv);
//---------------------------------------------------------------------------------------------------------//

export default {router, authRouter};
