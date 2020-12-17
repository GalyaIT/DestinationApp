
const UserModel = firebase.auth();
const db = firebase.firestore();

const app = Sammy('#container', function () {

    this.use('Handlebars', 'hbs');

    //home routes
    this.get('/home', function (context) {
        db.collection('destinations').get()
            .then((response) => {
                context.destinations = response.docs
                    .map((destination) => { return { id: destination.id, ...destination.data() } })

                console.log(context.destinations);
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/home.hbs')
                    })
            })
            .catch(errorHandler)
    });

    this.get('/destinations', function (context) {
        db.collection('destinations').get()
            .then((response) => {
                context.destinations = response.docs
                    .map((destination) => { return { id: destination.id, ...destination.data() } })
                    .filter(x => x.creator == getUserData().uid)

                console.log(context.destinations);
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/destinations.hbs')
                    })
            })
            .catch(errorHandler)
    });

    //user routes

    //register get
    this.get('/register', function (context) {

        extendContext(context)
            .then(function () {
                this.partial('./templates/register.hbs')
            })
    });

    //register post
    this.post('/register', function (context) {

        const { email, password, rePassword } = context.params;
        if (!emailIsValid(email)) {
            notify.showError('Email is invalid');
           
        } else if (email == '' || password == '' || rePassword == '') {
            notify.showError('The fields can\'t be empty');
           
        }else if (password !== rePassword) {
            notify.showError('The passwords don\'t match!');
           
        }else{
            UserModel.createUserWithEmailAndPassword(email, password)
            .then((userData) => {
                console.log(userData);
                notify.showInfo('User registration successful');
                UserModel.signInWithEmailAndPassword(email, password)
                    .then((userData) => {
                        saveUserData(userData);
                        this.redirect('/home');
                    })
            })
            .catch(errorHandler);

        }

      
    });

    //login get
    this.get('/login', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/login.hbs')
            })

    });
    //login post
    this.post('/login', function (context) {

        const { email, password } = context.params;
        if (!emailIsValid(email)) {
            notify.showError('Email is invalid');
        }else if (email == '' || password == '') {
            notify.showError('The fields can\'t be empty');
        }else if (password.length < 6) {
            notify.showError('Password must be at least 6 symbols');
        }else{
            UserModel.signInWithEmailAndPassword(email, password)
            .then((userData) => {
                saveUserData(userData);
                notify.showInfo('Login successful.');
                this.redirect('/home');
            })
            .catch(errorHandler);
        }
       
    });

    //logout
    this.get('/logout', function (context) {
        UserModel.signOut()
            .then((response) => {
                clearUserData();
                notify.showInfo('Logout successful.');
                this.redirect('/login');
            })
            .catch(errorHandler);
    })



    //create-destination get
    this.get('/add', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/add.hbs')
            })
    });

    //create-destination post
    this.post('/add', function (context) {
        const { destination, city, duration, departureDate, imgUrl } = context.params;
        if (destination === '' || city === '' || departureDate === '' || imgUrl === '') {
            notify.showError('The fields can\'t be empty');
            
        } else if (Number(duration) < 1 || Number(duration) > 100) {
            notify.showError('Number (of days) – must be between [1…100]');
            
        }else{
            db.collection('destinations').add({
                destination,
                city,
                duration,
                departureDate,
                imgUrl,
                creator: getUserData().uid,
    
            })
                .then(() => {
                    notify.showInfo('The destination was added successful.');
                    this.redirect('/home');
                })
                .catch(errorHandler);
        }
       
    });

    // edit get
    this.get('/edit/:destinationId', function (context) {
        const { destinationId } = context.params;
        db.collection('destinations').doc(destinationId)
            .get()
            .then((response) => {
                context.destination = { id: destinationId, ...response.data() }
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/edit.hbs')
                    })
            })
    });

    //edit post

    this.post('/edit/:destinationId', function (context) {
        const { destinationId, destination, city, duration, departureDate, imgUrl } = context.params;
      
        
        if (destination === '' || city === '' || departureDate === '' || imgUrl === '') {
            notify.showError('The fields can\'t be empty');
            
        } else if (Number(duration) < 1 || Number(duration) > 100) {
            notify.showError('Number (of days) – must be between [1…100]');
        }else{
            db.collection('destinations')
            .doc(destinationId)
            .update({
                destination,
                city,
                duration,
                departureDate,
                imgUrl
            })
            .then((response) => {
                console.log(response);
                notify.showInfo('The destination was edited successful.');
                this.redirect(`#/details/${destinationId}`);
            })
            .catch(errorHandler);
        }
       
    });

    //details 
    this.get('/details/:destinationId', function (context) {
        const { destinationId } = context.params;
        db.collection('destinations').doc(destinationId)
            .get()
            .then((response) => {
                const actuallDestinationData = response.data();
                const isCreator = actuallDestinationData.creator === getUserData().uid;
                console.log(isCreator);
                context.destination = { ...actuallDestinationData, id: destinationId, isCreator }
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs')
                    })
            })
    });

    //delete
    this.get('/delete/:destinationId', function (context) {
        const { destinationId } = context.params;
        db.collection('destinations').doc(destinationId)
            .delete()
            .then(() => {
                notify.showInfo('The destination was removed successful.');
                this.redirect('/destinations');
            })
            .catch(errorHandler);
    })


});


app.run('#/home');



function extendContext(context) {
    const user = getUserData();
    console.log(user);
    context.isLoggedIn = Boolean(user);

    context.email = user ? user.email : '';
    return context.loadPartials({
        'header': './templates/partials/header.hbs',
        'footer': './templates/partials/footer.hbs'
    })
}

function errorHandler(error) {
    console.log(error);
}

function saveUserData(data) {
    const { user: { email, uid } } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }));
}

function getUserData() {
    const user = localStorage.getItem('user');

    return user ? JSON.parse(user) : null;
}

function clearUserData(data) {
    this.localStorage.removeItem('user');
}

function emailIsValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}