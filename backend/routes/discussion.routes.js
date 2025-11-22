const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion.model');
const { protect } = require('../middleware/auth.middleware');

// @desc    Get discussions for a project
// @route   GET /api/discussions/:projectId
// @access  Public
router.get('/:projectId', async (req, res) => {
  try {
    const discussions = await Discussion.find({ 
      project: req.params.projectId 
    })
      .populate('author', 'name avatar')
      .populate('replies.author', 'name avatar')
      .sort({ isPinned: -1, createdAt: -1 });
    
    res.json({
      success: true,
      count: discussions.length,
      data: discussions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب النقاشات',
      error: error.message
    });
  }
});

// @desc    Create new discussion
// @route   POST /api/discussions/:projectId
// @access  Private
router.post('/:projectId', protect, async (req, res) => {
  try {
    const { title, content, type, tags } = req.body;
    
    const discussion = await Discussion.create({
      project: req.params.projectId,
      author: req.user.id,
      title,
      content,
      type,
      tags
    });
    
    await discussion.populate('author', 'name avatar');
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء النقاش بنجاح',
      data: discussion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء النقاش',
      error: error.message
    });
  }
});

// @desc    Add reply to discussion
// @route   POST /api/discussions/:discussionId/reply
// @access  Private
router.post('/:discussionId/reply', protect, async (req, res) => {
  try {
    const { content } = req.body;
    
    const discussion = await Discussion.findById(req.params.discussionId);
    
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'النقاش غير موجود'
      });
    }
    
    discussion.replies.push({
      author: req.user.id,
      content
    });
    
    await discussion.save();
    await discussion.populate('replies.author', 'name avatar');
    
    res.json({
      success: true,
      message: 'تمت الإضافة بنجاح',
      data: discussion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الرد',
      error: error.message
    });
  }
});

// @desc    Like/Unlike discussion
// @route   POST /api/discussions/:discussionId/like
// @access  Private
router.post('/:discussionId/like', protect, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.discussionId);
    
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'النقاش غير موجود'
      });
    }
    
    const likeIndex = discussion.likes.indexOf(req.user.id);
    
    if (likeIndex > -1) {
      // Unlike
      discussion.likes.splice(likeIndex, 1);
    } else {
      // Like
      discussion.likes.push(req.user.id);
    }
    
    await discussion.save();
    
    res.json({
      success: true,
      data: { likes: discussion.likes.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الإعجاب',
      error: error.message
    });
  }
});

module.exports = router;
