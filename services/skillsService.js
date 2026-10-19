const Skill = require('../models/skills');
const AppError = require('../utils/AppError');

class SkillsService {

    async createSkill(skillData) {
        try {
            const newSkill = new Skill(skillData);
            await newSkill.save();
            return newSkill;
        } catch (error) {
            // Captura el error de índice único de MongoDB
            if (error.code === 11000) {
                throw new AppError('SKILL_NAME_ALREADY_EXISTS');
            }
            // Lanza cualquier otro error para que lo capture el manejador global
            throw error;
        }
    }

    async getSkills({ active } = {}) {
        let filter = {};

        if (active === true) {
            // Las tecnologías creadas por el endpoint legado no tenían el
            // campo status. Se consideran activas para no ocultarlas del ABM.
            filter = {
                $or: [
                    { status: true },
                    { status: { $exists: false } }
                ]
            };
        } else if (active === false) {
            filter = { status: false };
        }

        return Skill.find(filter).select('-__v').sort({ name: 1 });
    }

    async getAllSkill() {
        return this.getSkills();
    }

    async updateSkill(id, updates) {
        if (!updates.name && !updates.description && typeof updates.status === 'undefined') {
            throw new AppError('SKILL_NO_UPDATE_DATA');
        }

        try {
            const updatedSkill = await Skill.findByIdAndUpdate(
                id,
                { $set: updates },
                { new: true, runValidators: true }
            );

            if (!updatedSkill) {
                throw new AppError('SKILL_NOT_FOUND');
            }
            return updatedSkill;

        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('SKILL_NAME_ALREADY_EXISTS');
            }
            throw error;
        }
    }

    async deleteSkill(id) {
        const deletedSkill = await Skill.findByIdAndDelete(id);
        if (!deletedSkill) {
            throw new AppError('SKILL_NOT_FOUND');
        }
        return deletedSkill;
    }
}

module.exports = new SkillsService();
