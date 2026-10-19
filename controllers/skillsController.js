const SkillsService = require('../services/skillsService');
const AppError = require('../utils/AppError');
const messages = require('../utils/messages');

const createSkill = async (req, res) => {
    const { name, description, status } = req.body;
    if (!name || !name.trim()) {
        throw new AppError('SKILL_MISSING_FIELDS');
    }
    const newSkill = await SkillsService.createSkill({
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        status: typeof status === 'boolean' ? status : true
    });
    return res.status(201).json({
        status: "success",
        message: messages.success.SKILL_CREATED,
        skill: newSkill
    });
};

const getAllSkill = async (req, res) => {
    const { active } = req.query; 
    let activeBool;
    if (active === 'true') activeBool = true;
    else if (active === 'false') activeBool = false;

    const skills = await SkillsService.getSkills({ active: activeBool });
    const normalizedSkills = skills.map((skill) => {
        const item = skill.toJSON();
        return {
            ...item,
            // Compatibilidad con registros creados antes de incorporar el ABM.
            status: typeof item.status === 'boolean' ? item.status : true
        };
    });
    return res.status(200).json(normalizedSkills);
};
const updateSkill = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const updatedSkill = await SkillsService.updateSkill(id, updates);
    return res.status(200).json({
        status: "success",
        message: messages.success.SKILL_UPDATED,
        skill: updatedSkill
    });
};

const deleteSkill = async (req, res) => {
    const { id } = req.params;
    await SkillsService.deleteSkill(id);
    return res.status(200).json({
        status: "success",
        message: messages.success.SKILL_DELETED
    });
};

module.exports = {
    createSkill,
    getAllSkill,
    updateSkill,
    deleteSkill
};
