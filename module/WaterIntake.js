const mongoose=require('mongoose')
const testschema=mongoose.Schema({
name: { type: String, required: true },
  amoutOfWater: { type: Number, default: 0 }
})
const Test=mongoose.model("Test",testschema)
module.exports=Test