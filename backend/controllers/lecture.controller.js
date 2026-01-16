const Lecture = require('../models/Lecture.model');

// Get all lectures
exports.getAllLectures = async (req, res) => {
  try {
    const lectures = await Lecture.find({ isActive: true })
      .populate('instructor', 'name email')
      .populate('project', 'title')
      .sort({ scheduledTime: 1 });

    res.json({
      success: true,
      data: lectures
    });
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({
      success: false,
      message: 'فشل تحميل المحاضرات'
    });
  }
};

// Get lecture by ID
exports.getLectureById = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('instructor', 'name email')
      .populate('project', 'title');

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'المحاضرة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: lecture
    });
  } catch (error) {
    console.error('Error fetching lecture:', error);
    res.status(500).json({
      success: false,
      message: 'فشل تحميل المحاضرة'
    });
  }
};

// Create new lecture (teacher/admin only)
exports.createLecture = async (req, res) => {
  try {
    const { title, description, meetingLink, scheduledTime, project } = req.body;

    // Validate required fields
    if (!title || !meetingLink || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال جميع الحقول المطلوبة'
      });
    }

    const lecture = await Lecture.create({
      title,
      description,
      meetingLink,
      scheduledTime,
      project,
      instructor: req.user._id
    });

    const populatedLecture = await Lecture.findById(lecture._id)
      .populate('instructor', 'name email')
      .populate('project', 'title');

    res.status(201).json({
      success: true,
      data: populatedLecture,
      message: 'تم إنشاء المحاضرة بنجاح'
    });
  } catch (error) {
    console.error('Error creating lecture:', error);
    res.status(500).json({
      success: false,
      message: 'فشل إنشاء المحاضرة'
    });
  }
};

// Update lecture (teacher/admin only)
exports.updateLecture = async (req, res) => {
  try {
    const { title, description, meetingLink, scheduledTime, project } = req.body;

    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'المحاضرة غير موجودة'
      });
    }

    // Check if user is the instructor or admin
    if (lecture.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذه المحاضرة'
      });
    }

    lecture.title = title || lecture.title;
    lecture.description = description || lecture.description;
    lecture.meetingLink = meetingLink || lecture.meetingLink;
    lecture.scheduledTime = scheduledTime || lecture.scheduledTime;
    lecture.project = project || lecture.project;

    await lecture.save();

    const updatedLecture = await Lecture.findById(lecture._id)
      .populate('instructor', 'name email')
      .populate('project', 'title');

    res.json({
      success: true,
      data: updatedLecture,
      message: 'تم تحديث المحاضرة بنجاح'
    });
  } catch (error) {
    console.error('Error updating lecture:', error);
    res.status(500).json({
      success: false,
      message: 'فشل تحديث المحاضرة'
    });
  }
};

// Delete lecture (teacher/admin only)
exports.deleteLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'المحاضرة غير موجودة'
      });
    }

    // Check if user is the instructor or admin
    if (lecture.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذه المحاضرة'
      });
    }

    // Soft delete
    lecture.isActive = false;
    await lecture.save();

    res.json({
      success: true,
      message: 'تم حذف المحاضرة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    res.status(500).json({
      success: false,
      message: 'فشل حذف المحاضرة'
    });
  }
};
