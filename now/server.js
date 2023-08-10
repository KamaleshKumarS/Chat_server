const express=require('express');
const bodyParser=require('body-parser');
const jwt=require('jsonwebtoken');
const cors=require('cors');
const app=express();
const mongoose=require('mongoose');
mongoose.connect('mongodb+srv://kam:kam@cluster0.r6cmb.mongodb.net/?retryWrites=true&w=majority');
const userSchema=new mongoose.Schema({username:String,password:String,email:String})
const Kuser=new mongoose.model('Kuser',userSchema);
const conSchema=new mongoose.Schema({members:Array,text:Array})
const Conversations=new mongoose.model('Conversations',conSchema)
let Socketusers=[]
app.use(express.json())
app.use(bodyParser.json({extended:true}));
app.use(bodyParser.urlencoded({extended:true}));
app.use(cors());
const io=require('socket.io')(5000,{
	cors:{
		orgin:['*'],
	}
})
app.post('/register',(req,res)=>{
	console.log(req.body)
	if(req.body){
		Kuser.findOne({username:req.body.username,email:req.body.email}).then((val,err)=>{
			console.log(val);
			if(val!=null){
				res.json({'userCreated':false,repeat:true});
			}else{
				const user1=new Kuser({
			username:req.body.username,
			password:req.body.pass,
			email:req.body.email
		})
			user1.save()
			const token=generateAccessToken(user1.email);
			res.json({'userCreated':true,token:token,user_id:user1._id});
			}
		})}
		
	else{
		res.json({'usercreated':false});
	}
});
app.post('/login',async(req,res)=>{
	const email=req.body.email;
	const password=req.body.pass;
	const u=await Kuser.findOne({email:email,password:password}).then((val,err)=>{
		if(val!=undefined || val!=null){
			console.log('userFound');
			const token=generateAccessToken(val.email);
			res.json({auth:true,token:token,user_id:val._id})
		}
		else{
			console.log('userNotFound');
			res.json({auth:false})
		}
	})
})
const generateAccessToken=(v)=>{
	const token=jwt.sign({user:v},'secret');
	return token;
}
app.get('/',(req,res)=>{
	const authToken=req.headers['x-access-token'];
	if (authToken){
		jwt.verify(authToken,'secret',(err,val)=>{
			if(err){
				res.json({auth:false});
			}
			else{
				res.json({auth:true});
			}
		})
	}else{
		console.log("no authToken");
	}
});
app.post('/toName',async(req,res)=>{
	const toName=req.body.reciever_id;
	const myId=req.body.myId;
	await Kuser.findOne({username:toName}).then(async val=>{
		if (val!=null){
			console.log('userFound')
			const toId=String(val._id)
			console.log(toId)
			await Conversations.findOne({
$and:[
{members:
{$in:[myId,['shdfwj63r081	rt2w3r']]}
},
{members:{$in:[toId,['shdfwj63r081	rt2w3r']]
}
}
]}
).then(vall=>{
				console.log(vall)
				if(vall!=null){
					console.log('existingf cnvo fund')
					res.json({
						convfound:true,conversationId:vall._id,toId:toId
					})
				}
				else{
					const cnvv=new Conversations({
						members:[myId,toId]
					})
					cnvv.save();
					res.json({
						convfound:true,conversationId:cnvv._id,toId:toId
					})
				}
			})
		}
		else{
			res.json({convfound:false})
		}
	})
})
app.post('/fetch-conv',async(req,res)=>{
	const convId=req.body.conversationId;
	await Conversations.findById(convId).then(val=>{
		if(val!=null){
		res.json({
			found:true,
			text:val.text,
		})
	}else{
		res.json({
			found:false,
		})
	}
	})
});
app.post('/add-conv',async(req,res)=>{
	const convId=req.body.conversationId;
	const message=req.body.sendMessage;
	await Conversations.findByIdAndUpdate(convId,{$push:{text:message}}).then(val=>{
		console.log('val')
		res.json({updated:true})
	})
});
app.get('/get-users',async(req,res)=>{
	Kuser.find({},{_id:1,username:1}).then(val=>{
		console.log(val)
		res.json(val)
	})
})
const addUser=(id,soId)=>{
	Socketusers=Socketusers.filter(user=>user.id!==id)
	Socketusers.push({id:id,socketId:soId})
	console.log(Socketusers)
}
const removeUser=(soid)=>{
	Socketusers=Socketusers.filter(user=>user.socketId!==soid)
	console.log(Socketusers)
}
io.on('connection',socket=>{
	socket.on('add-user',id=>{
		addUser(id,socket.id)
	})
	socket.on('send-message',(({reciever,message})=>{
		const Suser=Socketusers.filter(user=>user.id===reciever)
		console.log("message sent :",Suser) 
		if(!Suser[0]){
			console.log("No Suser");
			return
		}
		socket.to(Suser[0].socketId).emit('priv-msg',message);
	}))
	


	socket.on('disconnect',()=>{
		removeUser(socket.id)
	})
})

app.listen(4000,()=>{
	console.log('server started on 4000');
	console.log("hh");	
});