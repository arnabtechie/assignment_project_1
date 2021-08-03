import jwt from 'jsonwebtoken';
import UserModel from '../models/users.js';
import Question from '../models/questions.js';
import mongoose from 'mongoose';
import Category from '../models/categories.js';
import bcrypt from 'bcryptjs';
import csv from 'csv-parser';
import randomstring from 'randomstring';
import { check, validationResult } from 'express-validator';
import catchAsync from '../utils/catchAsync.js';
import fs from 'fs';


export default {
    login: catchAsync(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()){
        return res.status(400).send({
          status: 'fail',
          error: errors
        })
      }

      req.body.username = req.body.username.replace(/\s+/g, '').toLowerCase();

      const user = await UserModel.findOne({username: req.body.username});
      
      if (user){
        const isMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isMatch){
            return res.status(400).send({
                status: 'fail',
                message: 'password is incorrect, try again'
            });
        }

        const token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY);

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
        });

        user.password = undefined;
        
        return res.status(200).send({
            status: 'success',
            message: 'logged in successfully',
            data: user
        });


      } else {
        try {
          const newUser = await UserModel.create({
            username: req.body.username,
            password: req.body.password,
          });

          const token = jwt.sign({ _id: newUser._id }, process.env.SECRET_KEY);

          res.cookie('jwt', token, {
              httpOnly: true,
              secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
          });
  
          newUser.password = undefined;
  
          return res.status(200).send({
              status: 'success',
              message: 'logged in successfully',
              data: newUser
          });


        } catch (err){
          return res.status(400).send({
            status: 'fail',
            message: err
          });
        }
      }
    }),

    updateProfile: catchAsync(async (req, res, next) => {

      const user = await UserModel.findOne({_id: req.user._id});

      if (req.body.username){
        const username = await UserModel.findOne({$and: [{username: req.body.username}, {_id: {$ne: req.user._id}}]});

        if (username){
          return res.status(400).send({
            status: 'fail',
            errors: 'username already exists, try different'
          });
        }

        user.username = req.body.username;
      }

      if (req.files){
        const photo = req.files[0];
        const ext = photo.originalname.split('.')[1];
        const photoName = user._id + '.' + ext;
        user.profilePicture = photoName

        fs.writeFileSync('public/images/' + photoName, photo.buffer, (err) => {
          if (err){
            return res.status(400).send({
              status: 'fail',
              errors: 'file upload failed'
            });
        }
          
          console.log("File written successfully\n");
        });
      }

      if (req.body.password){
        user.password = req.body.password;
      }

      user.save();

      return res.status(200).send({
        status: 'success',
        message: 'user updated'
      })
      
    }),

    viewProfile: catchAsync(async (req, res, next) => {
      const userId = mongoose.Types.ObjectId(req.user._id);

      const user = await UserModel.aggregate([
        {$match: {_id: userId}},

        {$lookup: {
          from: "categories",
          pipeline: [{$match: {user: userId}}, {$project: {"name": 1}}],
          as: "categoriesCreated"
        }},

        {$lookup: {
          from: "questions",
          pipeline: [{$match: {user: userId}}, {$project: {"name": 1}}],
          as: "questionsCreated"
        }},

        {$project: {"password": 0}}
      ]);
      
      return res.status(200).send({
        status: 'success',
        data: user[0]
      })

    }),

    addCategoryOrQuestion: catchAsync(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()){
        return res.status(400).send({
          status: 'fail',
          error: errors
        })
      }

      req.body.user = req.user._id;

      if (req.body.type === 'question'){
        let question = await Question.findOne({name: req.body.name, user: req.user._id});
        if (!question){
          question = await Question.create(req.body);
        }

        return res.status(201).send({
          status: 'success',
          message: 'question added',
          data: question
        });
      } else if (req.body.type === 'category'){

        let category = await Category.findOne({name: req.body.name, user: req.user._id});
        if (!category){
          category = await Category.create(req.body);
        }

        return res.status(201).send({
          status: 'success',
          message: 'category added',
          data: category
        });
      }

      return res.status(400).send({
        status: 'fail',
        errors: 'invalid input',
      });

    }),

    allCategoriesListOnly: catchAsync(async (req, res, next) => {
      const userId = mongoose.Types.ObjectId(req.user._id);

      if (req.query.user === 'true'){
        console.log(req.user);
        const data = await Category.find({user: userId});

        return res.status(201).send({
          status: 'success',
          data: data
        });
      } else {
        const data = await Category.find({});

        return res.status(200).send({
          status: 'success',
          data: data
        });
      }
    }),

    allCategoriesListWithQuestions: catchAsync(async (req, res, next) => {
      const userId = mongoose.Types.ObjectId(req.user._id);

      if (req.query.user === 'true'){
        const data = await Category.aggregate([
          {$match: {user: userId}},

          {$lookup: {
            from: "questions",
            let: {id: "$_id"},
            pipeline: [{$match: {$expr: {$in: ["$$id", "$category"]}}},
            {$project: {"createdAt": 0, "updatedAt": 0, "category": 0}}],
            as: "questions"
          }},

          {$project: {"createdAt": 0, "updatedAt": 0}}
        ])

        return res.status(201).send({
          status: 'success',
          data: data
        });
      
      } else {
        const data = await Category.aggregate([
          {$lookup: {
            from: "questions",
            let: {id: "$_id"},
            pipeline: [{$match: {$expr: {$in: ["$$id", "$category"]}}},
            {$project: {"createdAt": 0, "updatedAt": 0, "category": 0}}],
            as: "questions"
          }},

          {$project: {"createdAt": 0, "updatedAt": 0}}
        ])

        return res.status(200).send({
          status: 'success',
          data: data
        });
      }
    }),

    assignCategoryToQuestion: catchAsync(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()){
        return res.status(400).send({
          status: 'fail',
          error: errors
        })
      }

      const questionId = mongoose.Types.ObjectId(req.body.questionId);
      const categoryId = req.body.categoryId;

      try {
        if (Array.isArray(categoryId)){
          for await (const i of categoryId){
            await Question.updateOne({_id: questionId, user: req.user._id}, {$addToSet: {category: i}});
          }
        } else {
          await Question.updateOne({_id: questionId, user: req.user._id}, {$addToSet: {category: categoryId}});
        }

        return res.status(200).send({
          status: 'success',
          message: 'assigned'
        });

      } catch (err){
        return res.status(400).send({
          status: 'fail',
          errors: err,
        });
      }
    }),

    allQuestionForEachCategory: catchAsync(async (req, res, next) => {
      if (!req.query.categoryId){
        return res.status(400).send({
          status: 'fail',
          errors: 'category id is required as query parameter categoryId'
        });
      }

      const categoryId = mongoose.Types.ObjectId(req.query.categoryId);

      const questions = await Question.aggregate([
        {$match: {$expr: {$in: [categoryId, "$category"]}}}
      ]);

      return res.status(200).send({
        status: 'success',
        data: questions
      });
    }),

    importDataFromCsv: catchAsync(async (req, res, next) => {
      if (!req.files){
        return res.status(400).send({
          status: 'fail',
          errors: 'no files provided'
        });
      }

      const file = req.files[0];
      const ext = file.originalname.split('.')[1];

      if (ext !== 'csv'){
        return res.status(400).send({
          status: 'fail',
          errors: 'invalid format, please provide csv file'
        });
      }

      const fileName = randomstring.generate(5) + '.' + ext;

      new Promise((resolve, reject) => {
        const results = [];
        fs.writeFileSync('public/' + fileName, file.buffer);
        fs.createReadStream('public/' + fileName)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results);
        });
      }).then(async (results) => {

        for (const r of results){
          let question = await Question.findOne({name: r.Question, user: req.user._id});
          question = question || await Question.create({name: r.Question, user: req.user._id});

          r.Category = r.Category.split(',');

          if (r.Category.length > 1){
            for (const i of r.Category){
              let category = await Category.findOne({name: i, user: req.user._id});
              if (category){
                await Question.updateOne({_id: question._id, user: req.user._id}, {$addToSet: {category: category._id}});
              } else {
                category = await Category.create({name: i, user: req.user._id});
                await Question.updateOne({_id: question._id, user: req.user._id}, {$addToSet: {category: category._id}});
              }
            }
          } else {
            let category = await Category.findOne({name: r.Category[0], user: req.user._id});
            if (category){
              await Question.updateOne({_id: question._id, user: req.user._id}, {$addToSet: {category: category._id}});
            } else {
              category = await Category.create({name: r.Category[0], user: req.user._id});
              await Question.updateOne({_id: question._id, user: req.user._id}, {$addToSet: {category: category._id}});
            }
          }
        }
      }).catch((err) => {
        console.log(err);
      })

      return res.status(200).send({
        status: 'success',
        message: 'done'
      });

    }),

    logout: catchAsync(async (req, res, next) => {
      res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
      });
      return res.status(200).send({
          status: 'success',
          message: 'logged out'
      });
    })
}